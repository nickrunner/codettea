import { Response } from 'express';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface SSEClient {
  id: string;
  featureName?: string;
  response: Response;
  lastEventId?: string;
}

export interface SSEMessage {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export class SSEService extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private messageId: number = 0;

  constructor() {
    super();
    logger.info('SSEService initialized');
    
    // Clean up disconnected clients periodically
    setInterval(() => this.cleanupDisconnectedClients(), 30000); // Every 30 seconds
  }

  /**
   * Add a new SSE client
   */
  public addClient(clientId: string, response: Response, featureName?: string): void {
    const client: SSEClient = {
      id: clientId,
      featureName,
      response,
    };

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    });

    // Send initial connection message
    this.sendToClient(client, {
      event: 'connected',
      data: { 
        message: 'SSE connection established',
        clientId,
        featureName,
        timestamp: new Date().toISOString()
      }
    });

    // Add to clients map
    this.clients.set(clientId, client);
    logger.info(`SSE client ${clientId} connected${featureName ? ` for feature ${featureName}` : ''}`);

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });
  }

  /**
   * Remove a client
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.info(`SSE client ${clientId} disconnected`);
      this.emit('client:disconnected', clientId);
    }
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(client: SSEClient, message: SSEMessage): boolean {
    try {
      const lines: string[] = [];
      
      // Add event type if specified
      if (message.event) {
        lines.push(`event: ${message.event}`);
      }
      
      // Add message ID
      const id = message.id || `${++this.messageId}`;
      lines.push(`id: ${id}`);
      client.lastEventId = id;
      
      // Add retry if specified
      if (message.retry) {
        lines.push(`retry: ${message.retry}`);
      }
      
      // Add data (must be last)
      const dataStr = typeof message.data === 'string' 
        ? message.data 
        : JSON.stringify(message.data);
      
      // Split data by newlines and send each line with 'data:' prefix
      dataStr.split('\n').forEach(line => {
        lines.push(`data: ${line}`);
      });
      
      // Send the message (double newline marks end of message)
      const messageStr = lines.join('\n') + '\n\n';
      client.response.write(messageStr);
      
      return true;
    } catch (error) {
      logger.error(`Failed to send SSE message to client ${client.id}:`, error);
      this.removeClient(client.id);
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  public broadcast(message: SSEMessage): void {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  /**
   * Send message to clients watching a specific feature
   */
  public sendToFeature(featureName: string, message: SSEMessage): void {
    this.clients.forEach(client => {
      if (client.featureName === featureName) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Send heartbeat to keep connections alive
   */
  public sendHeartbeat(): void {
    const heartbeat: SSEMessage = {
      event: 'heartbeat',
      data: { timestamp: new Date().toISOString() }
    };
    
    this.clients.forEach(client => {
      this.sendToClient(client, heartbeat);
    });
  }

  /**
   * Clean up disconnected clients
   */
  private cleanupDisconnectedClients(): void {
    const disconnected: string[] = [];
    
    this.clients.forEach((client, id) => {
      try {
        // Try to send a heartbeat to check if connection is alive
        const heartbeat = `:heartbeat\n\n`;
        client.response.write(heartbeat);
      } catch (error) {
        disconnected.push(id);
      }
    });
    
    disconnected.forEach(id => this.removeClient(id));
    
    if (disconnected.length > 0) {
      logger.info(`Cleaned up ${disconnected.length} disconnected SSE clients`);
    }
  }

  /**
   * Get client count
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients for a specific feature
   */
  public getFeatureClients(featureName: string): number {
    let count = 0;
    this.clients.forEach(client => {
      if (client.featureName === featureName) {
        count++;
      }
    });
    return count;
  }
}

// Singleton instance
export const sseService = new SSEService();

// Send heartbeat every 30 seconds to keep connections alive
setInterval(() => {
  sseService.sendHeartbeat();
}, 30000);