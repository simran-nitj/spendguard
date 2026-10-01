import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { UserRepository, userRepository } from '../users/user.repository';
import { TokenRepository, tokenRepository } from './token.repository';
import { ConflictError, UnauthorizedError } from '../../errors/AppError';
import { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schemas';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private tokenRepo: TokenRepository = tokenRepository,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateTokens(userId: string, email: string): AuthTokens {
    const accessToken = jwt.sign(
      { sub: userId, email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.tokenRepo.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const tokens = this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async refresh(input: RefreshInput): Promise<AuthTokens> {
    try {
      jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const tokenHash = this.hashToken(input.refreshToken);
    const existingToken = await this.tokenRepo.findByTokenHash(tokenHash);

    if (!existingToken) {
      throw new UnauthorizedError('Refresh token not found.');
    }

    // Reuse detection: if a revoked token is presented, revoke all user tokens for security
    if (existingToken.revokedAt) {
      await this.tokenRepo.revokeAllUserTokens(existingToken.userId);
      throw new UnauthorizedError('Token reuse detected. All sessions have been revoked.');
    }

    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired.');
    }

    // Revoke current token (rotation)
    await this.tokenRepo.revokeToken(existingToken.id);

    const user = await this.userRepo.findById(existingToken.userId);
    if (!user) {
      throw new UnauthorizedError('User associated with token no longer exists.');
    }

    const newTokens = this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  async logout(input: LogoutInput): Promise<{ message: string }> {
    const tokenHash = this.hashToken(input.refreshToken);
    const existingToken = await this.tokenRepo.findByTokenHash(tokenHash);

    if (existingToken && !existingToken.revokedAt) {
      await this.tokenRepo.revokeToken(existingToken.id);
    }

    return { message: 'Logged out successfully.' };
  }
}

export const authService = new AuthService();
