# Codettea Web UI

A React-based web interface for the Codettea multi-agent development engine.

## Features

- **Dashboard**: Real-time overview of agents, features, and system status
- **Feature Management**: Create, view, and manage feature development workflows
- **Agent Monitoring**: Track active agents with live log streaming
- **Worktree Management**: View and manage Git worktrees
- **Configuration Editor**: Modify system settings through the UI
- **Real-time Updates**: WebSocket integration for instant status updates
- **Keyboard Shortcuts**: Quick navigation throughout the application

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** with shadcn/ui components
- **Zustand** for state management
- **Socket.io** for WebSocket communication
- **React Query** for API data fetching
- **React Router** for navigation

## Development

### Prerequisites

1. Install dependencies:
```bash
cd web
npm install
```

2. Ensure the API server is running:
```bash
npm run web  # From project root
```

### Available Scripts

```bash
# Development server with hot reload (port 3457)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + D` | Go to Dashboard |
| `Cmd/Ctrl + F` | Go to Features |
| `Cmd/Ctrl + A` | Go to Agents |
| `Cmd/Ctrl + W` | Go to Worktrees |
| `Cmd/Ctrl + ,` | Go to Configuration |
| `Cmd/Ctrl + B` | Toggle Sidebar |
| `Cmd/Ctrl + /` | Toggle Dark/Light Theme |

## Project Structure

```
web/
├── src/
│   ├── api/           # API client and WebSocket client
│   ├── components/    # React components
│   │   ├── agents/    # Agent-related components
│   │   ├── features/  # Feature management components
│   │   ├── layout/    # Layout components (Header, Sidebar, etc.)
│   │   ├── shared/    # Shared/common components
│   │   └── ui/        # shadcn/ui components
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── store/         # Zustand state management
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
└── dist/              # Build output (generated)
```

## UI Components

The UI is built with a combination of custom components and shadcn/ui primitives:

- **Layout**: AppShell, Header, Sidebar, ConnectionStatus
- **Features**: FeatureList, FeatureDetail, IssueCard, NewFeatureDialog
- **Agents**: AgentList, AgentDetail with log streaming
- **Worktrees**: Worktree cards with Git status
- **Configuration**: System settings editor with project management

## API Integration

The web UI communicates with the backend through:

1. **REST API** (`/api/*`) for CRUD operations
2. **WebSocket** for real-time updates
3. **Server-Sent Events** for log streaming

All API calls include proper error handling and loading states.

## Building for Production

1. Build the UI:
```bash
cd web
npm run build
```

2. The built files will be in `web/dist/`
3. The API server automatically serves these files when running

## Deployment

The web UI is served directly by the API server on the same port (3456 by default). Access the UI by navigating to `http://localhost:3456` after starting the server with `npm run web`.

## Security Notes

- The UI is designed for local use only
- Authentication is token-based with localStorage persistence
- All API endpoints are restricted to localhost
- CORS is configured to only allow local origins