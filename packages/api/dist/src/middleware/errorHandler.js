"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const tsoa_1 = require("tsoa");
const logger_1 = require("../utils/logger");
function errorHandler(err, _req, res, _next) {
    if (err instanceof tsoa_1.ValidateError) {
        logger_1.logger.warn(`Validation Failed: ${JSON.stringify(err.fields)}`);
        res.status(422).json({
            message: 'Validation Failed',
            details: err.fields,
        });
        return;
    }
    if (err instanceof Error) {
        logger_1.logger.error(err);
        const response = {
            message: err.message || 'Internal Server Error',
        };
        if (process.env.NODE_ENV !== 'production') {
            response.stack = err.stack;
        }
        res.status(500).json(response);
        return;
    }
    logger_1.logger.error('Unknown error:', err);
    res.status(500).json({
        message: 'An unknown error occurred',
    });
}
//# sourceMappingURL=errorHandler.js.map