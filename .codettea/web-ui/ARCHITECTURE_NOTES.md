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