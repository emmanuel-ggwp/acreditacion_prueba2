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

     it('lanza el mismo error genérico para una cuenta desactivada (SB-28)', async () => {
      // Contraseña CORRECTA pero cuenta desactivada: debe lanzar exactamente el
      // mismo 'Invalid credentials' que una contraseña incorrecta, para no revelar
      // que la credencial era válida. El motivo real queda solo en auditoría.
      const credentials = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        isActive: false,
      };
      UserMock.findOne.mockResolvedValue(user as any);
      bcryptMock.compareSync.mockReturnValue(true);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
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
    it('should rotate tokens for a valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const user = { id: 'user-1', role: 'ADMIN', username: 'test', email: 'test@test.com' };
      const refreshTokenPayload = { id: user.id, exp: Date.now() / 1000 + 3600 };
      const newTokens = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };

      // La fila del token existe, no está revocada y no ha expirado.
      const existingToken = {
        token: refreshToken,
        isRevoked: false,
        expiresAt: addDays(new Date(), 30),
        update: jest.fn().mockResolvedValue(undefined),
      };
      RefreshTokenMock.findOne.mockResolvedValue(existingToken as any);
      verifyRefreshTokenMock.mockReturnValue(refreshTokenPayload);
      UserMock.findByPk.mockResolvedValue({ ...user, isActive: true } as any);
      generateTokensMock.mockReturnValue(newTokens);
      RefreshTokenMock.create.mockResolvedValue({ token: newTokens.refreshToken } as any);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(RefreshTokenMock.findOne).toHaveBeenCalledWith({ where: { token: refreshToken } });
      expect(verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(UserMock.findByPk).toHaveBeenCalledWith(user.id);
      // Se invalida el token anterior (rotación) y se emite uno nuevo.
      expect(existingToken.update).toHaveBeenCalledWith({ isRevoked: true });
      expect(generateTokens).toHaveBeenCalledWith({ id: user.id, role: user.role, email: user.email, username: user.username });
      expect(RefreshTokenMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ token: newTokens.refreshToken, userId: user.id })
      );
      expect(result).toEqual(newTokens);
    });

    it('should throw if the refresh token is not found or revoked', async () => {
      RefreshTokenMock.findOne.mockResolvedValue(null);
      await expect(authService.refreshAccessToken('missing-token')).rejects.toThrow('Invalid or revoked refresh token');
    });

    it('should revoke and throw for an expired refresh token', async () => {
      const expiredToken = {
        token: 'expired-token',
        isRevoked: false,
        expiresAt: addDays(new Date(), -1),
        update: jest.fn().mockResolvedValue(undefined),
      };
      RefreshTokenMock.findOne.mockResolvedValue(expiredToken as any);

      await expect(authService.refreshAccessToken('expired-token')).rejects.toThrow('Expired refresh token');
      expect(expiredToken.update).toHaveBeenCalledWith({ isRevoked: true });
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
