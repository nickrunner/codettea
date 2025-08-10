import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { stateManager } from '../state/manager';
import { StateUpdate } from '../state/types';

interface WSClient {
  id: string;
  ws: WebSocket;
  token: string;
  subscriptions: Set<string>;
  heartbeat: ReturnType<typeof setInterval> | null;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.subscribeToStateUpdates();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = crypto.randomUUID();
      console.log(`WebSocket client connected: ${clientId}`);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to Codettea WebSocket server'
      }));

      // Set up client
      const client: WSClient = {
        id: clientId,
        ws,
        token: '',
        subscriptions: new Set(['*']), // Subscribe to all events by default
        heartbeat: null
      };

      this.clients.set(clientId, client);

      // Set up heartbeat
      client.heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // Handle pong responses
      ws.on('pong', () => {
        // Client is alive
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        const client = this.clients.get(clientId);
        if (client?.heartbeat) {
          clearInterval(client.heartbeat);
        }
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'auth': {
        // Validate token
        const session = stateManager.validateSession(message.token);
        if (session) {
          client.token = message.token;
          client.ws.send(JSON.stringify({
            type: 'auth',
            status: 'success'
          }));
        } else {
          client.ws.send(JSON.stringify({
            type: 'auth',
            status: 'failed',
            message: 'Invalid token'
          }));
        }
        break;
      }

      case 'subscribe':
        // Subscribe to specific event types
        if (Array.isArray(message.events)) {
          message.events.forEach((event: string) => {
            client.subscriptions.add(event);
          });
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            events: message.events
          }));
        }
        break;

      case 'unsubscribe':
        // Unsubscribe from event types
        if (Array.isArray(message.events)) {
          message.events.forEach((event: string) => {
            client.subscriptions.delete(event);
          });
          client.ws.send(JSON.stringify({
            type: 'unsubscribed',
            events: message.events
          }));
        }
        break;

      case 'ping':
        // Respond to ping
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        client.ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  private subscribeToStateUpdates(): void {
    // Listen for state updates and broadcast to clients
    stateManager.on('stateUpdate', (update: StateUpdate) => {
      this.broadcastStateUpdate(update);
    });
  }

  private broadcastStateUpdate(update: StateUpdate): void {
    const message = JSON.stringify({
      type: 'stateUpdate',
      update
    });

    // Broadcast to all connected clients that are subscribed
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this type of update
        if (client.subscriptions.has('*') || 
            client.subscriptions.has(update.type) ||
            client.subscriptions.has(`${update.type}:${update.action}`)) {
          client.ws.send(message);
        }
      }
    });
  }

  // Public methods for sending targeted messages
  public sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  public broadcastAgentLog(agentId: string, log: string): void {
    this.broadcast({
      type: 'log:append',
      agentId,
      log
    });
  }

  public broadcastFeatureProgress(featureName: string, progress: any): void {
    this.broadcast({
      type: 'feature:progress',
      featureName,
      progress
    });
  }

  public broadcastIssueUpdate(issueNumber: number, update: any): void {
    this.broadcast({
      type: 'issue:update',
      issueNumber,
      update
    });
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public close(): void {
    // Clean up all clients
    this.clients.forEach((client) => {
      if (client.heartbeat) {
        clearInterval(client.heartbeat);
      }
      client.ws.close();
    });
    this.clients.clear();

    // Close WebSocket server
    this.wss.close();
  }
}

// Import crypto for UUID generation
import crypto from 'crypto';