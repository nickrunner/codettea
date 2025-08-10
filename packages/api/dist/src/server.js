"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const metrics_1 = require("./utils/metrics");
require("express-async-errors");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
// Parse CORS origins from environment variable (comma-separated)
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (corsOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined', { stream: logger_1.httpLogStream }));
// Add metrics middleware
app.use(metrics_1.metricsMiddleware);
try {
    const swaggerDocument = require('../dist/swagger.json');
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
}
catch (err) {
    logger_1.logger.warn('Swagger documentation not available. Run npm run swagger to generate.');
}
(0, routes_1.RegisterRoutes)(app);
app.use(errorHandler_1.errorHandler);
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
if (require.main === module) {
    const server = app.listen(PORT, () => {
        logger_1.logger.info(`Server is running on http://localhost:${PORT}`);
        logger_1.logger.info(`API documentation available at http://localhost:${PORT}/api/docs`);
        logger_1.logger.info(`Metrics available at http://localhost:${PORT}/api/metrics`);
    });
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
        logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
        // Stop accepting new connections
        server.close((err) => {
            if (err) {
                logger_1.logger.error('Error during server close:', err);
                process.exit(1);
            }
            logger_1.logger.info('HTTP server closed');
            // Close database connections, flush logs, etc.
            // Add any cleanup logic here
            setTimeout(() => {
                logger_1.logger.info('Graceful shutdown complete');
                process.exit(0);
            }, 100);
        });
        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger_1.logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    };
    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
        logger_1.logger.error('Uncaught Exception:', err);
        gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map