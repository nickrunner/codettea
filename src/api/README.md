# Codettea API Server

HTTP API server for controlling the multi-agent development engine.

## Quick Start

```bash
# Start the server
npm run web

# Or with custom port
API_PORT=8080 npm run web

# Development mode with auto-reload
npm run web:dev
```

## Authentication

The API uses token-based authentication:

1. Get the initial API token from server startup logs
2. Generate a session token:
```bash
curl -X POST http://localhost:3456/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_API_TOKEN"}'
```
3. Use the session token in subsequent requests:
```bash
curl http://localhost:3456/api/config \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## API Documentation

Full OpenAPI documentation available at: http://localhost:3456/api-docs

## Key Endpoints

### System
- `GET /health` - Health check (no auth)
- `GET /api/config` - Get configuration
- `PATCH /api/config` - Update configuration
- `POST /api/auth/token` - Generate session token

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/stop` - Stop agent
- `GET /api/agents/:id/logs` - Get agent logs (supports streaming)

### Features
- `GET /api/features` - List features
- `POST /api/features` - Create new feature
- `GET /api/features/:name` - Get feature details
- `POST /api/features/:name/issues/:number/work` - Start working on issue

### Worktrees
- `GET /api/worktrees` - List worktrees
- `POST /api/worktrees` - Create worktree
- `DELETE /api/worktrees/:name` - Remove worktree
- `GET /api/worktrees/:name/status` - Get git status

## WebSocket Support

Connect to `ws://localhost:3456/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3456/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'YOUR_SESSION_TOKEN'
}));

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['agent', 'feature', 'issue']
}));

// Handle updates
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'stateUpdate') {
    console.log('State updated:', msg.update);
  }
});
```

## Environment Variables

- `API_PORT` - Server port (default: 3456)
- `API_TOKEN` - Override default API token
- `NODE_ENV` - Set to 'development' for verbose errors

## State Persistence

State is persisted to `.codettea/state/` directory:
- `app-state.json` - Application state
- `config.json` - System configuration

## Security

- Localhost-only by default (CORS restricted)
- Token-based authentication required for all API endpoints
- No external network exposure
- File system access restricted to project directory