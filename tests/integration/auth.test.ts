import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('Auth Endpoints (Integration)', () => {
  const mockUser = {
    id: 'user-uuid-123',
    email: 'integration@example.com',
    passwordHash: '',
    name: 'Integration User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 12);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integration@example.com',
          password: 'Password123!',
          name: 'Integration User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('integration@example.com');
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 validation error for short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integration@example.com',
          password: 'short',
          name: 'Integration User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 conflict when registering existing email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integration@example.com',
          password: 'Password123!',
          name: 'Integration User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in user and return 200 with tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(mockUser.id);
      expect(response.body.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return 200', async () => {
      const sampleRefreshToken = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_super_secure_key_min_32_chars',
      );
      const tokenHash = crypto.createHash('sha256').update(sampleRefreshToken).digest('hex');

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'ref-token-1',
        userId: mockUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({} as any);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: sampleRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke token and return 200', async () => {
      const sampleRefreshToken = 'some-token-string';
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'ref-token-1',
        revokedAt: null,
      });
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: sampleRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });
});
