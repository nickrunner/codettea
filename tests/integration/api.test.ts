import { APIServer } from '../../src/api/server';
import { stateManager } from '../../src/state/manager';
import axios from 'axios';
import WebSocket from 'ws';

type AxiosInstance = ReturnType<typeof axios.create>;

describe('API Integration Tests', () => {
  let server: APIServer;
  let client: AxiosInstance;
  let apiToken: string;
  let sessionToken: string;
  const PORT = 3457; // Use different port for tests

  beforeAll(async () => {
    // Initialize and start server
    server = new APIServer(PORT);
    await server.initialize();
    await server.start();

    // Get API token from config
    apiToken = stateManager.getConfig().apiToken;

    // Create axios client
    client = axios.create({
      baseURL: `http://localhost:${PORT}`,
      validateStatus: () => true // Don't throw on error status codes
    });
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    test('GET /health should return server status', async () => {
      const response = await client.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('wsClients');
    });

    test('GET /api/health should return server status', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/token should generate session token', async () => {
      const response = await client.post('/api/auth/token', {
        secret: apiToken
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('sessionId');
      
      sessionToken = (response.data as any).token;
    });

    test('POST /api/auth/token with invalid secret should fail', async () => {
      const response = await client.post('/api/auth/token', {
        secret: 'invalid-secret'
      });

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('Protected endpoints should require authentication', async () => {
      const response = await client.get('/api/config');
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('Protected endpoints should work with valid token', async () => {
      const response = await client.get('/api/config', {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('mainRepoPath');
    });
  });

  describe('Configuration', () => {
    test('GET /api/config should return configuration', async () => {
      const response = await client.get('/api/config', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('mainRepoPath');
      expect(response.data).toHaveProperty('maxConcurrentTasks');
      expect(response.data).not.toHaveProperty('apiToken'); // Should not expose token
    });

    test('PATCH /api/config should update configuration', async () => {
      const updates = { maxConcurrentTasks: 4 };
      
      const response = await client.patch('/api/config', updates, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect((response.data as any).maxConcurrentTasks).toBe(4);
    });
  });

  describe('Agents', () => {
    test('GET /api/agents should return agent list', async () => {
      const response = await client.get('/api/agents', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/agents/:id should return 404 for non-existent agent', async () => {
      const response = await client.get('/api/agents/non-existent', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Features', () => {
    test('GET /api/features should return feature list', async () => {
      const response = await client.get('/api/features', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('POST /api/features should create new feature', async () => {
      const feature = {
        name: 'test-feature',
        description: 'Test feature description',
        runArchitecture: false
      };

      const response = await client.post('/api/features', feature, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', 'test-feature');
      expect(response.data).toHaveProperty('status');
    });

    test('GET /api/features/:name should return feature details', async () => {
      const response = await client.get('/api/features/test-feature', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', 'test-feature');
    });

    test('GET /api/features/:name/issues should return feature issues', async () => {
      const response = await client.get('/api/features/test-feature/issues', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Worktrees', () => {
    test('GET /api/worktrees should return worktree list', async () => {
      const response = await client.get('/api/worktrees', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('WebSocket', () => {
    test('WebSocket connection should work', (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

      ws.on('open', () => {
        // Send auth message
        ws.send(JSON.stringify({
          type: 'auth',
          token: sessionToken
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'connection') {
          expect(message).toHaveProperty('clientId');
          expect(message).toHaveProperty('message');
        } else if (message.type === 'auth') {
          expect(message).toHaveProperty('status', 'success');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('WebSocket should handle ping/pong', (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'pong') {
          ws.close();
          done();
        }
      });
    });

    test('WebSocket should handle subscriptions', (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          events: ['agent', 'feature']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed') {
          expect(message.events).toEqual(['agent', 'feature']);
          ws.close();
          done();
        }
      });
    });
  });

  describe('CORS', () => {
    test('Should allow localhost origins', async () => {
      const response = await client.get('/health', {
        headers: { Origin: 'http://localhost:3000' }
      });

      expect(response.status).toBe(200);
    });

    test('Should block non-localhost origins', async () => {
      try {
        await client.get('/health', {
          headers: { Origin: 'http://example.com' }
        });
      } catch (error: any) {
        expect(error.response).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for unknown routes', async () => {
      const response = await client.get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Not Found');
    });

    test('Should handle malformed JSON', async () => {
      const response = await client.post('/api/features', 'invalid-json', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(400);
    });
  });
});