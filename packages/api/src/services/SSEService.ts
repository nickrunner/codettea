import { Response } from 'express';

interface SSEClient {
  id: string;
  response: Response;
  featureName?: string;
  taskId?: string;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private messageId = 0;

  /**
   * Add a new SSE client
   */
  addClient(clientId: string, response: Response, featureName?: string, taskId?: string): void {
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    response.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Store client
    this.clients.set(clientId, {
      id: clientId,
      response,
      featureName,
      taskId,
    });

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.response.end();
      this.clients.delete(clientId);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      const message = `id: ${++this.messageId}\ndata: ${JSON.stringify(data)}\n\n`;
      client.response.write(message);
    }
  }

  /**
   * Send message to all clients for a specific feature
   */
  sendToFeature(featureName: string, data: any): void {
    this.clients.forEach((client) => {
      if (client.featureName === featureName) {
        this.sendToClient(client.id, data);
      }
    });
  }

  /**
   * Send message to all clients for a specific task
   */
  sendToTask(taskId: string, data: any): void {
    this.clients.forEach((client) => {
      if (client.taskId === taskId) {
        this.sendToClient(client.id, data);
      }
    });
  }

  /**
   * Broadcast to all clients
   */
  broadcast(data: any): void {
    this.clients.forEach((client) => {
      this.sendToClient(client.id, data);
    });
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients by feature
   */
  getFeatureClients(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.clients.forEach((client) => {
      if (client.featureName) {
        counts[client.featureName] = (counts[client.featureName] || 0) + 1;
      }
    });
    return counts;
  }

  /**
   * Send heartbeat to keep connections alive
   */
  sendHeartbeat(): void {
    this.clients.forEach((client) => {
      client.response.write(':heartbeat\n\n');
    });
  }
}

// Export singleton instance
export const sseService = new SSEService();

// Send heartbeat every 30 seconds
setInterval(() => {
  sseService.sendHeartbeat();
}, 30000);