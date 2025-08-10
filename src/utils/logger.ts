import { EventEmitter } from 'events';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

class Logger extends EventEmitter {
  private logLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    super();
    this.logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, message, context };

    // Emit for real-time log streaming
    this.emit('log', entry);

    if (this.isProduction) {
      // Structured JSON logging for production
      return JSON.stringify(entry);
    } else {
      // Human-readable format for development
      const levelEmoji = {
        debug: '🔍',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        error: '❌'
      };
      
      let output = `${timestamp} ${levelEmoji[level]} [${level.toUpperCase()}] ${message}`;
      if (context && Object.keys(context).length > 0) {
        output += ` ${JSON.stringify(context)}`;
      }
      return output;
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, any> | Error): void {
    if (this.shouldLog('error')) {
      let errorContext = context;
      if (context instanceof Error) {
        errorContext = {
          error: context.message,
          stack: context.stack,
          name: context.name
        };
      }
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Singleton instance
export const logger = new Logger();

// Export for type usage
export default Logger;