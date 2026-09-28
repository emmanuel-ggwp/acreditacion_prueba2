/**
 * Servicio de autenticación (AuthService).
 *
 * Gestiona el ciclo de vida de la sesión: inicio de sesión, alta de usuarios por
 * un ADMIN, rotación de tokens de refresco y cierre de sesión. Reglas de negocio:
 * - Compara siempre el email por su forma canónica (`normalizeEmail`), que es la
 *   que guarda el hook del modelo (R2-03c).
 * - Las contraseñas se verifican con bcrypt (`bcrypt.compareSync`).
 * - Devuelve el MISMO mensaje genérico `'Invalid credentials'` ante credenciales
 *   erróneas y ante cuenta desactivada (SB-28), para evitar enumeración de
 *   usuarios; la distinción real solo queda en el registro de auditoría.
 * - Emite JWT de acceso y refresco (`generateTokens`); los tokens de refresco se
 *   persisten en `RefreshToken` con 30 días de vigencia y se revocan al rotarlos.
 */
import { loginSchema, registerSchema } from '@/utils/validators/authSchemas';
import { User, RefreshToken } from '@/models/index';
import { generateTokens, verifyRefreshToken } from '@/lib/jwt';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

import { auditLogService } from './auditLogService';
import { normalizeEmail } from '@/utils/email';

/**
 * Encapsula la autenticación de usuarios y la gestión de tokens de sesión.
 */
export class AuthService {
  /**
   * Autentica a un usuario y emite tokens de acceso y de refresco.
   *
   * Valida las credenciales con `loginSchema`, busca al usuario por email
   * canónico y verifica la contraseña con bcrypt. Si el usuario no existe, la
   * contraseña es incorrecta o la cuenta está desactivada, lanza el mismo error
   * genérico (SB-28). En éxito actualiza `lastLogin`, persiste el token de
   * refresco (30 días) y audita el `LOGIN`.
   *
   * @param credentials - Credenciales `{ email, password }` validadas contra `loginSchema`.
   * @returns Promesa que resuelve a `{ user, accessToken, refreshToken }`, donde `user` incluye `id`, `email`, `username`, `firstName`, `lastName` y `role`.
   * @throws {ZodError} Si `credentials` no cumple `loginSchema` (lanzado por `.parse`).
   * @throws {Error} `'Invalid credentials'` si el usuario no existe, la contraseña es incorrecta o la cuenta está desactivada (`isActive` falso). En este último caso se audita el intento fallido antes de lanzar.
   */
  async login(credentials: z.infer<typeof loginSchema>) {
    const validatedCredentials = loginSchema.parse(credentials);

    // La columna guarda la forma canónica (hook del modelo, R2-03c): buscar
    // sin normalizar dejaría fuera a quien teclee su email con mayúsculas.
    const user = await User.findOne({ where: { email: normalizeEmail(validatedCredentials.email) } });
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
      // Mismo mensaje genérico que "contraseña incorrecta" (SB-28): un error
      // distinto ("cuenta desactivada") permitiría a quien tenga una credencial
      // robada CONFIRMAR que era válida aunque la cuenta esté suspendida —
      // información útil para reutilizarla en otros servicios (el escenario
      // post-compromiso de esta auditoría). La distinción real queda solo en el
      // registro de auditoría de arriba, no en la respuesta al cliente.
      throw new Error('Invalid credentials');
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

  /**
   * Registra un nuevo usuario; solo un ADMIN puede hacerlo.
   *
   * Verifica el rol del creador, valida los datos con `registerSchema` y comprueba
   * que el email (en forma canónica, R2-03c) no esté ya en uso antes de crear el
   * usuario (el hook del modelo hashea la contraseña).
   *
   * @param userData - Datos del nuevo usuario, validados contra `registerSchema`.
   * @param creatorRole - Rol del usuario que solicita el alta; debe ser `'ADMIN'`.
   * @returns Promesa que resuelve al usuario creado con `id`, `email`, `firstName`, `lastName` y `role` (sin contraseña).
   * @throws {Error} `'Only admins can register new users.'` si `creatorRole` no es `'ADMIN'`.
   * @throws {ZodError} Si `userData` no cumple `registerSchema` (lanzado por `.parse`).
   * @throws {Error} `'Email already in use'` si ya existe un usuario con ese email canónico.
   */
  async register(userData: z.infer<typeof registerSchema>, creatorRole: string) {
    if (creatorRole !== 'ADMIN') {
        throw new Error('Only admins can register new users.');
    }
    const validatedData = registerSchema.parse(userData);

    // La comprobación de duplicado compara contra la forma canónica, que es la
    // que guarda el hook del modelo (R2-03c); sin esto, `Admin@X.com` pasaba el
    // control y luego chocaba (o no) con la unicidad según la grafía guardada.
    const existingUser = await User.findOne({ where: { email: normalizeEmail(validatedData.email) } });
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

  /**
   * Rota un token de refresco: valida el actual, lo revoca y emite un par nuevo.
   *
   * Comprueba que el token exista, no esté revocado ni caducado (si caducó lo
   * revoca), verifica su firma con `verifyRefreshToken` y que el usuario siga
   * activo. Luego revoca el token usado y persiste un nuevo token de refresco
   * (30 días), devolviendo tokens frescos.
   *
   * @param token - Token de refresco actual a validar y rotar.
   * @returns Promesa que resuelve a `{ accessToken, refreshToken }` con los tokens nuevos.
   * @throws {Error} `'Invalid or revoked refresh token'` si el token no existe o ya está revocado.
   * @throws {Error} `'Expired refresh token'` si el token caducó (además lo marca como revocado).
   * @throws {Error} `'Invalid refresh token payload'` si la firma/carga del token no es válida.
   * @throws {Error} `'User not found for this token or is inactive'` si el usuario del token no existe o está inactivo.
   */
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

  /**
   * Cierra la sesión revocando el token de refresco indicado.
   *
   * Si el token existe lo marca como revocado y audita el `LOGOUT`. Si no existe,
   * la operación es idempotente y no hace nada (no lanza).
   *
   * @param token - Token de refresco a revocar.
   * @returns Promesa que resuelve a `{ message: 'Logged out successfully' }` en todos los casos.
   */
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
}

export const authService = new AuthService();
