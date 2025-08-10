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
require("express-async-errors");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
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
    app.listen(PORT, () => {
        logger_1.logger.info(`Server is running on http://localhost:${PORT}`);
        logger_1.logger.info(`API documentation available at http://localhost:${PORT}/api/docs`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map