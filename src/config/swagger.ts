import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpendGuard API: Transaction Tracker with Fraud Flagging',
      version: '1.0.0',
      description:
        'Production-ready fintech REST API featuring JWT authentication, transactional banking management, real-time rule-based fraud detection, and financial analytics.',
      contact: {
        name: 'SpendGuard Engineering',
        email: 'engineering@spendguard.io',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token in the format: Bearer <token>',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'BAD_REQUEST' },
                message: { type: 'string', example: 'Invalid input payload' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid', nullable: true },
            name: { type: 'string' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 149.99 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            merchant: { type: 'string', example: 'Whole Foods Market' },
            description: { type: 'string', nullable: true, example: 'Weekly groceries' },
            occurredAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FraudFlag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            transactionId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            rule: {
              type: 'string',
              enum: ['LARGE_AMOUNT', 'HIGH_VELOCITY', 'DUPLICATE', 'NEW_MERCHANT_HIGH_VALUE'],
            },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['OPEN', 'REVIEWED', 'DISMISSED'] },
            createdAt: { type: 'string', format: 'date-time' },
            resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Database Connectivity Health Check',
          tags: ['Health'],
          responses: {
            200: { description: 'API & Database are healthy' },
            500: { description: 'Database connectivity failure' },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          summary: 'Register a new user account',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created successfully' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Authenticate and receive access & refresh tokens',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authentication successful' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          summary: 'Rotate refresh token and issue new access token',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Tokens rotated successfully' },
            401: { description: 'Invalid, revoked, or expired refresh token' },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          summary: 'Revoke refresh token session',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Logged out successfully' },
          },
        },
      },
      '/api/v1/categories': {
        get: {
          summary: 'List user and system categories',
          tags: ['Categories'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'List of accessible categories' },
          },
        },
        post: {
          summary: 'Create custom user category',
          tags: ['Categories'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Category created' },
          },
        },
      },
      '/api/v1/transactions': {
        post: {
          summary: 'Create a transaction and execute real-time fraud rules',
          tags: ['Transactions'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['categoryId', 'amount', 'type', 'merchant'],
                  properties: {
                    categoryId: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', example: 125.5 },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                    merchant: { type: 'string', example: 'Target' },
                    description: { type: 'string' },
                    occurredAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Transaction created, returns transaction + raised fraud flags' },
          },
        },
        get: {
          summary: 'List transactions with multi-field filtering and pagination',
          tags: ['Transactions'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] } },
            { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'minAmount', in: 'query', schema: { type: 'number' } },
            { name: 'maxAmount', in: 'query', schema: { type: 'number' } },
            { name: 'merchant', in: 'query', schema: { type: 'string' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['occurredAt', 'amount'] } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          ],
          responses: {
            200: { description: 'Paginated transactions list' },
          },
        },
      },
      '/api/v1/fraud/flags': {
        get: {
          summary: 'List detected fraud flags',
          tags: ['Fraud Detection'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'REVIEWED', 'DISMISSED'] } },
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Paginated list of fraud flags' },
          },
        },
      },
      '/api/v1/summaries/monthly': {
        get: {
          summary: 'Get monthly financial summary and MoM comparison',
          tags: ['Summaries'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'string', example: '2026-09' } },
          ],
          responses: {
            200: { description: 'Monthly income/expense totals, category breakdown, top merchants' },
          },
        },
      },
      '/api/v1/summaries/trend': {
        get: {
          summary: 'Get multi-month financial trends',
          tags: ['Summaries'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'months', in: 'query', schema: { type: 'integer', default: 6 } },
          ],
          responses: {
            200: { description: 'Historical monthly breakdown' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
