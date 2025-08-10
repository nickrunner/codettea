import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';

const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Codettea API',
    version: '1.0.0',
    description: 'API for controlling the multi-agent development engine',
    contact: {
      name: 'Codettea Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:3456',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['arch', 'solver', 'reviewer'] },
          status: { type: 'string', enum: ['idle', 'running', 'completed', 'failed'] },
          featureName: { type: 'string' },
          issueNumber: { type: 'integer' },
          startTime: { type: 'integer' },
          endTime: { type: 'integer' },
          logs: { type: 'array', items: { type: 'string' } },
          error: { type: 'string' }
        }
      },
      Feature: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          branch: { type: 'string' },
          worktreePath: { type: 'string' },
          issues: { type: 'array', items: { type: 'integer' } },
          status: { type: 'string', enum: ['planning', 'in-progress', 'reviewing', 'completed'] },
          createdAt: { type: 'integer' },
          updatedAt: { type: 'integer' }
        }
      },
      Issue: {
        type: 'object',
        properties: {
          number: { type: 'integer' },
          title: { type: 'string' },
          featureName: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'solving', 'reviewing', 'approved', 'rejected', 'completed'] },
          attempts: { type: 'integer' },
          assignedAgent: { type: 'string' },
          prNumber: { type: 'integer' },
          reviewers: { type: 'array', items: { type: 'string' } }
        }
      },
      Worktree: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          branch: { type: 'string' },
          featureName: { type: 'string' },
          status: { type: 'string', enum: ['active', 'stale', 'archived'] },
          createdAt: { type: 'integer' }
        }
      },
      Config: {
        type: 'object',
        properties: {
          mainRepoPath: { type: 'string' },
          baseWorktreePath: { type: 'string' },
          maxConcurrentTasks: { type: 'integer' },
          requiredApprovals: { type: 'integer' },
          reviewerProfiles: { type: 'array', items: { type: 'string' } },
          apiPort: { type: 'integer' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'object' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    uptime: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/config': {
      get: {
        summary: 'Get configuration',
        tags: ['System'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current configuration',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Config' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update configuration',
        tags: ['System'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Config' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated configuration',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Config' }
              }
            }
          }
        }
      }
    },
    '/api/agents': {
      get: {
        summary: 'List all agents',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Agent' }
                }
              }
            }
          }
        }
      }
    },
    '/api/agents/{id}': {
      get: {
        summary: 'Get agent details',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Agent details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Agent' }
              }
            }
          },
          '404': {
            description: 'Agent not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/agents/{id}/stop': {
      post: {
        summary: 'Stop an agent',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Agent stopped',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Agent' }
              }
            }
          }
        }
      }
    },
    '/api/features': {
      get: {
        summary: 'List all features',
        tags: ['Features'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of features',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Feature' }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create new feature',
        tags: ['Features'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  runArchitecture: { type: 'boolean' }
                },
                required: ['name', 'description']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Created feature',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Feature' }
              }
            }
          }
        }
      }
    },
    '/api/worktrees': {
      get: {
        summary: 'List all worktrees',
        tags: ['Worktrees'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of worktrees',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Worktree' }
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: 'System', description: 'System management endpoints' },
    { name: 'Agents', description: 'Agent management endpoints' },
    { name: 'Features', description: 'Feature management endpoints' },
    { name: 'Worktrees', description: 'Worktree management endpoints' }
  ]
};

export function setupOpenAPI(app: Express): void {
  // Serve OpenAPI documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Codettea API Documentation'
  }));

  // Serve OpenAPI JSON
  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });
}