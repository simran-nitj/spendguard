import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';
import { CategoryType } from '@prisma/client';

export const createTestUser = async (overrides: { email?: string; password?: string; name?: string } = {}) => {
  const email = overrides.email || `test-${Date.now()}-${Math.random()}@example.com`;
  const password = overrides.password || 'Password123!';
  const name = overrides.name || 'Test User';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_super_secure_key_min_32_chars',
    { expiresIn: '15m' },
  );

  return { user, password, accessToken };
};

export const createTestCategory = async (userId: string | null, name: string, type: CategoryType = CategoryType.EXPENSE) => {
  return prisma.category.create({
    data: {
      userId,
      name,
      type,
    },
  });
};
