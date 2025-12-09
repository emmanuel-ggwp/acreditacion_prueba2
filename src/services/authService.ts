import { Op } from 'sequelize';
import { loginSchema, registerSchema } from '@/utils/validators/authSchemas';
import { User, RefreshToken } from '@/models/index';
import { generateTokens, verifyRefreshToken } from '@/lib/jwt';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

import { auditLogService } from './auditLogService';

export class AuthService {
  async login(credentials: z.infer<typeof loginSchema>) {
    const validatedCredentials = loginSchema.parse(credentials);

    const user = await User.findOne({ where: { email: validatedCredentials.email } });
    if (!user || !bcrypt.compareSync(validatedCredentials.password, user.password)) {
      // Generic error message to prevent user enumeration
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      await auditLogService.log({
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: { success: false, reason: 'User account is disabled' },
      });
      throw new Error('User account is disabled');
    }

    await user.update({ lastLogin: new Date() });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({ id: user.id, role: user.role, email: user.email, username: user.username });

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: addDays(new Date(), 30),
    });

    await auditLogService.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { success: true },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async register(userData: z.infer<typeof registerSchema>, creatorRole: string) {
    if (creatorRole !== 'ADMIN') {
        throw new Error('Only admins can register new users.');
    }
    const validatedData = registerSchema.parse(userData);

    const existingUser = await User.findOne({ where: { email: validatedData.email } });
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const user = await User.create(validatedData);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async refreshAccessToken(token: string) {
    const existingRefreshToken = await RefreshToken.findOne({ where: { token } });

    if (!existingRefreshToken || existingRefreshToken.isRevoked) {
      throw new Error('Invalid or revoked refresh token');
    }

    if (existingRefreshToken.expiresAt < new Date()) {
      await existingRefreshToken.update({ isRevoked: true });
      throw new Error('Expired refresh token');
    }

    const refreshTokenPayload = verifyRefreshToken(token);
    if (!refreshTokenPayload) {
      throw new Error('Invalid refresh token payload');
    }

    const user = await User.findByPk(refreshTokenPayload.id);
    if (!user || !user.isActive) {
      throw new Error('User not found for this token or is inactive');
    }

    // Invalidate the old refresh token
    await existingRefreshToken.update({ isRevoked: true });

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    });

    // Store the new refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: addDays(new Date(), 30),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    const refreshToken = await RefreshToken.findOne({ where: { token } });
    if (refreshToken) {
      await refreshToken.update({ isRevoked: true });
      await auditLogService.log({
        userId: refreshToken.userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: refreshToken.userId,
        details: { success: true },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async revokeAllUserTokens(userId: string) {
    await RefreshToken.update({ isRevoked: true }, { where: { userId } });
    return { message: 'All tokens revoked' };
  }

  async cleanExpiredTokens() {
    await RefreshToken.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
    console.log('Expired refresh tokens cleaned up.');
  }
}

export const authService = new AuthService();
