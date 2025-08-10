"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevels = exports.httpLogStream = exports.createLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const logDir = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
// Custom format for production logs
const productionFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
}), winston_1.default.format.json());
// Custom format for development logs
const developmentFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'HH:mm:ss.SSS'
}), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
}));
// Create transports array
const transports = [];
// Console transport
if (process.env.NODE_ENV === 'production') {
    transports.push(new winston_1.default.transports.Console({
        format: productionFormat,
        handleExceptions: true,
        handleRejections: true
    }));
}
else {
    transports.push(new winston_1.default.transports.Console({
        format: developmentFormat,
        handleExceptions: true,
        handleRejections: true
    }));
}
// File transports with rotation for production
if (process.env.NODE_ENV === 'production') {
    // Error log file with rotation
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '14d',
        handleExceptions: true,
        handleRejections: true
    }));
    // Combined log file with rotation
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '14d',
        handleExceptions: true,
        handleRejections: true
    }));
    // Audit log for important events
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '30d',
        auditFile: path_1.default.join(logDir, 'audit-log.json')
    }));
}
else {
    // Simple file logging for development
    transports.push(new winston_1.default.transports.File({
        filename: 'error.log',
        level: 'error',
        format: productionFormat
    }));
    transports.push(new winston_1.default.transports.File({
        filename: 'combined.log',
        format: productionFormat
    }));
}
// Create the logger instance
exports.logger = winston_1.default.createLogger({
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
const createLogger = (module) => {
    return exports.logger.child({ module });
};
exports.createLogger = createLogger;
// Stream for Morgan HTTP logging
exports.httpLogStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    }
};
// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    exports.logger.error('Unhandled Rejection', { reason, promise });
});
// Log uncaught exceptions
process.on('uncaughtException', (error) => {
    exports.logger.error('Uncaught Exception', { error });
    // Give logger time to write before exiting
    setTimeout(() => process.exit(1), 1000);
});
// Export log levels for use in other modules
exports.LogLevels = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    VERBOSE: 'verbose',
    DEBUG: 'debug',
    SILLY: 'silly'
};
//# sourceMappingURL=logger.js.map