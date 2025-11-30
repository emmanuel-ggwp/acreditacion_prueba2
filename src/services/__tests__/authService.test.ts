// src/services/__tests__/authService.test.ts
import { AuthService } from '../authService';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import { generateTokens, verifyRefreshToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

jest.mock('@/models/User');
jest.mock('@/models/RefreshToken');
jest.mock('@/lib/jwt');
jest.mock('bcryptjs');

const UserMock = User as jest.Mocked<typeof User>;
const RefreshTokenMock = RefreshToken as jest.Mocked<typeof RefreshToken>;
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;
const generateTokensMock = generateTokens as jest.Mock;
const verifyRefreshTokenMock = verifyRefreshToken as jest.Mock;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login a user with valid credentials and return tokens', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        update: jest.fn().mockResolvedValue(this),
      };
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      const refreshTokenInstance = { token: 'refresh-token' };

      UserMock.findOne.mockResolvedValue(user as any);
      bcryptMock.compareSync.mockReturnValue(true);
      generateTokensMock.mockReturnValue(tokens);
      RefreshTokenMock.create.mockResolvedValue(refreshTokenInstance as any);

      const result = await authService.login(credentials);

      expect(UserMock.findOne).toHaveBeenCalledWith({ where: { email: credentials.email } });
      expect(bcrypt.compareSync).toHaveBeenCalledWith(credentials.password, user.password);
      expect(user.update).toHaveBeenCalledWith({ lastLogin: expect.any(Date) });
      expect(generateTokens).toHaveBeenCalledWith({ id: user.id, role: user.role, email: user.email, username: user.username });
      expect(RefreshTokenMock.create).toHaveBeenCalledWith({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: expect.any(Date),
      });
      expect(result).toEqual({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: refreshTokenInstance.token,
      });
    });

    it('should throw an error for invalid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'wrongpassword' };
      UserMock.findOne.mockResolvedValue(null);
      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

     it('should throw an error for a disabled user', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        isActive: false,
      };
      UserMock.findOne.mockResolvedValue(user as any);
      bcryptMock.compareSync.mockReturnValue(true);

      await expect(authService.login(credentials)).rejects.toThrow('User account is disabled');
    });
  });

  describe('register', () => {
    const userData = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      role: 'OPERATOR' as const,
      username: 'newuser',
    };

    it('should register a new user if creator is ADMIN', async () => {
      const createdUser = { id: 'user-2', ...userData };
      UserMock.findOne.mockResolvedValue(null);
      UserMock.create.mockResolvedValue(createdUser as any);

      const result = await authService.register(userData, 'ADMIN');

      expect(UserMock.findOne).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(UserMock.create).toHaveBeenCalledWith(expect.objectContaining({ email: userData.email }));
      expect(result).toEqual(expect.objectContaining({ email: userData.email }));
    });

    it('should throw an error if user already exists', async () => {
      UserMock.findOne.mockResolvedValue({ id: 'user-2' } as any);
      await expect(authService.register(userData, 'ADMIN')).rejects.toThrow('Email already in use');
    });

    it('should throw an error if creator is not ADMIN', async () => {
      await expect(authService.register(userData, 'MANAGER')).rejects.toThrow('Only admins can register new users.');
    });
  });

  describe('refreshAccessToken', () => {
    it('should return a new access token for a valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const user = { id: 'user-1', role: 'ADMIN', username: 'test', email: 'test@test.com' };
      const refreshTokenPayload = { id: user.id, exp: Date.now() / 1000 + 3600 };
      const newAccessToken = { accessToken: 'new-access-token' };

      verifyRefreshTokenMock.mockReturnValue(refreshTokenPayload);
      UserMock.findByPk.mockResolvedValue({ ...user, isActive: true } as any);
      generateTokensMock.mockReturnValue(newAccessToken);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(UserMock.findByPk).toHaveBeenCalledWith(user.id);
      expect(generateTokens).toHaveBeenCalledWith({ id: user.id, role: user.role, username: user.username, email: user.email });
      expect(result).toEqual(newAccessToken);
    });

    it('should throw an error for an invalid refresh token', async () => {
      verifyRefreshTokenMock.mockReturnValue(null);
      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      const refreshTokenInstance = { token: 'valid-token', update: jest.fn() };
      RefreshTokenMock.findOne.mockResolvedValue(refreshTokenInstance as any);

      const result = await authService.logout('valid-token');

      expect(RefreshTokenMock.findOne).toHaveBeenCalledWith({ where: { token: 'valid-token' } });
      expect(refreshTokenInstance.update).toHaveBeenCalledWith({ isRevoked: true });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
