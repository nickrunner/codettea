# @codettea/web

React-based web UI for the Codettea multi-agent development engine.

## Overview

This package provides a browser-based interface for controlling and monitoring the multi-agent orchestration system. It offers real-time status updates, feature management, and project configuration through an intuitive dashboard.

## Features

- **Claude Connection Monitoring**: Real-time status of Claude API connection
- **Feature Management**: Create, view, and track feature development progress
- **Project Selection**: Browse and activate different development projects
- **Issue Tracking**: Monitor progress of individual issues within features
- **Configuration Management**: Update system settings through the UI

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Backend API running on port 3001 (see `@codettea/api` package)

### Installation

From the monorepo root:

```bash
npm install
```

### Development

Start the development server:

```bash
# From monorepo root
npm run dev:web

# Or run both API and Web together
npm run dev:all
```

The application will be available at http://localhost:3000

### Building

Build for production:

```bash
# From monorepo root
npm run build:web
```

### Testing

Run tests:

```bash
# From monorepo root
npm run test:web

# With coverage
npm run test:coverage
```

## Architecture

### Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management
- **Axios**: HTTP client with retry logic
- **CSS Modules**: Scoped styling

### Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ClaudeStatus/
│   ├── FeatureList/
│   ├── ProjectSelector/
│   ├── IssueProgress/
│   └── Layout/
├── pages/           # Route-based page components
│   ├── Dashboard/
│   ├── Features/
│   ├── Projects/
│   └── Settings/
├── services/        # API client and services
│   └── api.ts
├── hooks/           # Custom React hooks
│   ├── useClaudeStatus.ts
│   ├── useFeatures.ts
│   └── useProjects.ts
├── types/           # TypeScript type definitions
│   └── api.ts
└── test/            # Test configuration
    └── setup.ts
```

### API Integration

The web application communicates with the backend API through a centralized API client (`services/api.ts`) that provides:

- Automatic retry logic for failed requests
- Comprehensive error handling
- TypeScript type safety
- Request/response interceptors

### State Management

State is managed through custom hooks that encapsulate API calls and local state:

- `useClaudeStatus`: Claude connection monitoring
- `useFeatures`: Feature CRUD operations
- `useProjects`: Project management
- `useFeatureIssues`: Issue tracking per feature

## Configuration

### Environment Variables

The application uses Vite's proxy configuration to route API calls to the backend:

```javascript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

### Ports

- **Development Server**: 3000
- **API Proxy Target**: 3001

## Testing

### Test Coverage

The package includes comprehensive tests for:

- **Components**: UI behavior and rendering
- **Hooks**: State management and API integration
- **Services**: API client error handling and retry logic

Coverage thresholds are set at 70% for:
- Branches
- Functions
- Lines
- Statements

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Accessibility

All components follow accessibility best practices:

- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility

## Performance

- Code splitting with React.lazy
- Optimized bundle size with Vite
- Efficient re-renders with React.memo
- Debounced API calls

## Contributing

See the main repository README for contribution guidelines.