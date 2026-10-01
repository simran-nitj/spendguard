import { AuthService } from '../../src/modules/auth/auth.service';
import { UserRepository } from '../../src/modules/users/user.repository';
import { TokenRepository } from '../../src/modules/auth/token.repository';
import { ConflictError, UnauthorizedError } from '../../src/errors/AppError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockTokenRepo: jest.Mocked<TokenRepository>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$MockHashedPasswordString',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as any;

    mockTokenRepo = {
      createRefreshToken: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as any;

    authService = new AuthService(mockUserRepo, mockTokenRepo);
  });

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should create user, generate tokens, and save refresh token', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockTokenRepo.createRefreshToken.mockResolvedValue({} as any);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockTokenRepo.createRefreshToken).toHaveBeenCalled();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError if user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password does not match', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should successfully log in and return tokens', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      mockTokenRepo.createRefreshToken.mockResolvedValue({} as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.tokens.accessToken).toBeDefined();
    });
  });

  describe('refresh (token rotation)', () => {
    it('should rotate tokens if valid refresh token is provided', async () => {
      const sampleRefreshToken = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_super_secure_key_min_32_chars',
      );

      const tokenHash = crypto.createHash('sha256').update(sampleRefreshToken).digest('hex');

      mockTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-id-1',
        userId: mockUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
      });

      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockTokenRepo.revokeToken.mockResolvedValue({} as any);
      mockTokenRepo.createRefreshToken.mockResolvedValue({} as any);

      const newTokens = await authService.refresh({ refreshToken: sampleRefreshToken });

      expect(mockTokenRepo.revokeToken).toHaveBeenCalledWith('token-id-1');
      expect(mockTokenRepo.createRefreshToken).toHaveBeenCalled();
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
    });

    it('should revoke all tokens if reuse of a revoked token is detected', async () => {
      const sampleRefreshToken = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_super_secure_key_min_32_chars',
      );

      const tokenHash = crypto.createHash('sha256').update(sampleRefreshToken).digest('hex');

      mockTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-id-1',
        userId: mockUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(), // Already revoked!
        createdAt: new Date(),
      });

      await expect(authService.refresh({ refreshToken: sampleRefreshToken })).rejects.toThrow(
        UnauthorizedError,
      );

      expect(mockTokenRepo.revokeAllUserTokens).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
