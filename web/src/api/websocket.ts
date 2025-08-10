import { io, Socket } from 'socket.io-client';
import type { Agent, Feature, Worktree } from '@/types';

export type WebSocketEvent = 
  | { type: 'agent:update'; data: Agent }
  | { type: 'agent:log'; data: { agentId: string; log: string } }
  | { type: 'feature:update'; data: Feature }
  | { type: 'worktree:update'; data: Worktree }
  | { type: 'system:notification'; data: { message: string; level: 'info' | 'warning' | 'error' } };

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io('/', {
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to WebSocket'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      // Set up event handlers
      this.setupEventHandlers();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Agent events
    this.socket.on('agent:update', (data: Agent) => {
      this.emit('agent:update', data);
    });

    this.socket.on('agent:log', (data: { agentId: string; log: string }) => {
      this.emit('agent:log', data);
    });

    // Feature events
    this.socket.on('feature:update', (data: Feature) => {
      this.emit('feature:update', data);
    });

    // Worktree events
    this.socket.on('worktree:update', (data: Worktree) => {
      this.emit('worktree:update', data);
    });

    // System notifications
    this.socket.on('system:notification', (data: { message: string; level: string }) => {
      this.emit('system:notification', data);
    });

    // Error handling
    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback as (data: unknown) => void);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  off(event: string, callback?: (data: unknown) => void): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  send(eventName: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit ${eventName}: WebSocket not connected`);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();