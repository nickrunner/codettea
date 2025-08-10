import winston from 'winston';
export declare const logger: winston.Logger;
export declare const createLogger: (module: string) => winston.Logger;
export declare const httpLogStream: {
    write: (message: string) => void;
};
export declare const LogLevels: {
    ERROR: string;
    WARN: string;
    INFO: string;
    HTTP: string;
    VERBOSE: string;
    DEBUG: string;
    SILLY: string;
};
//# sourceMappingURL=logger.d.ts.map