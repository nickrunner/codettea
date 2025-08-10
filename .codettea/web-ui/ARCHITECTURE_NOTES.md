# Web UI Architecture Notes

## Feature Overview
A local-first web UI to control the multi-agent development engine, providing a browser-based interface served on localhost for managing features, agents, worktrees, and configuration.

## Architecture Decisions

### 1. API Server Design
- **Express + WebSocket**: RESTful API with real-time updates via WebSocket
- **Port 3456**: Configurable but defaults to unused port
- **State Persistence**: JSON file-based storage in `.codettea/state/`
- **Authentication**: Simple token-based auth for localhost security
- **CORS**: Restricted to localhost only

### 2. Frontend Architecture
- **React 18 + TypeScript**: Modern, type-safe UI development
- **Vite**: Fast build tooling and HMR for development
- **TailwindCSS + shadcn/ui**: Consistent, accessible component library
- **Zustand**: Lightweight state management with WebSocket integration
- **Real-time Updates**: WebSocket subscriptions for agent status

### 3. Integration Strategy
- **Minimal Engine Changes**: API server wraps existing orchestrator
- **Process Management**: API spawns Claude agents as child processes
- **State Synchronization**: Persistent state allows UI reconnection
- **CLI Integration**: New `npm run web` command launches server

## Implementation Approach

### Phase 1: API Foundation (#19)
Build complete HTTP API server with all endpoints, WebSocket support, and state management. This provides the backend infrastructure for the UI.

### Phase 2: React UI (#20)
Implement full-featured React application with all UI components, real-time updates, and comprehensive feature management capabilities.

### Phase 3: Integration & Testing (#21)
Complete integration testing, security hardening, performance optimization, and production readiness including documentation and CLI integration.

## Key Technical Considerations

### Security
- Localhost-only binding (no external exposure)
- Token authentication for API access
- Input validation and sanitization
- Command injection prevention
- File system access restrictions

### Performance
- WebSocket for efficient real-time updates
- State caching to reduce file I/O
- Pagination for large datasets
- Debounced API calls from UI
- Concurrent operation handling

### Reliability
- Graceful error handling
- Automatic reconnection
- State persistence across restarts
- Process cleanup on shutdown
- Comprehensive logging

## Dependencies & Risks
- Requires Node.js for API server
- Browser compatibility (modern browsers only)
- File system permissions for state storage
- Port availability (configurable)

## Success Metrics
- Server starts and serves UI on localhost:3456
- All existing CLI functionality accessible via UI
- Real-time agent status updates working
- State persists across server restarts
- All existing tests continue to pass

## Implementation Details (Issue #19)

### API Server Structure
```
src/api/
├── server.ts           # Main Express server with middleware setup
├── websocket.ts        # WebSocket manager for real-time updates
├── openapi.ts          # OpenAPI/Swagger documentation
├── orchestrator-integration.ts  # Integration with existing orchestrator
├── middleware/
│   ├── auth.ts         # Token-based authentication
│   └── cors.ts         # CORS configuration (localhost only)
└── routes/
    ├── system.ts       # System config and auth endpoints
    ├── agents.ts       # Agent management endpoints
    ├── features.ts     # Feature management endpoints
    └── worktrees.ts    # Worktree management endpoints
```

### State Management
```
src/state/
├── types.ts           # TypeScript interfaces for state
├── manager.ts         # Singleton state manager with EventEmitter
└── persistence.ts     # JSON file persistence layer
```

### Key Implementation Choices
- **Express 4.x**: Stable version for reliability (downgraded from 5.x)
- **WebSocket Protocol**: Custom event-based protocol with auth support
- **State Pattern**: Centralized state manager with persistence
- **Process Spawning**: Direct integration with existing orchestrator
- **Token Auth**: Simple session-based authentication for localhost
- **OpenAPI Spec**: Complete API documentation via Swagger UI

### API Endpoints Implemented
All required endpoints have been implemented including:
- System management (health, config, projects, auth)
- Agent operations (list, details, stop, logs with streaming)
- Feature management (CRUD, issue assignment)
- Worktree operations (list, create, delete, status)
- WebSocket support for real-time updates

### Testing
- Comprehensive integration tests for all API endpoints
- WebSocket connection and message handling tests
- CORS validation tests
- Error handling tests
- TypeScript type checking passes
- ESLint validation passes