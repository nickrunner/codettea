import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Custom format for production logs
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

// Custom format for development logs
const developmentFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({
      format: productionFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// File transports with rotation for production
if (process.env.NODE_ENV === 'production') {
  // Error log file with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: productionFormat,
      maxSize: '20m',
      maxFiles: '14d',
      handleExceptions: true,
      handleRejections: true
    })
  );

  // Combined log file with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: productionFormat,
      maxSize: '20m',
      maxFiles: '14d',
      handleExceptions: true,
      handleRejections: true
    })
  );

  // Audit log for important events
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: productionFormat,
      maxSize: '20m',
      maxFiles: '30d',
      auditFile: path.join(logDir, 'audit-log.json')
    })
  );
} else if (process.env.NODE_ENV !== 'test') {
  // Simple file logging for development (but not during tests)
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: productionFormat,
        handleExceptions: false,
        handleRejections: false
      })
    );
    
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: productionFormat,
        handleExceptions: false,
        handleRejections: false
      })
    );
  } catch (error) {
    // Silently ignore file creation errors during testing
    console.warn('Warning: Could not create log files:', error);
  }
}

// Create the logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: productionFormat,
  defaultMeta: {
    service: 'codettea-api',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname(),
    pid: process.pid
  },
  transports,
  exitOnError: false
});

// Create child loggers for specific modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  // Give logger time to write before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Export log levels for use in other modules
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};