import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

interface TokenPayload {
  id: string;
  role: string;
  email: string;
  username: string;
}

export const generateTokens = (payload: TokenPayload) => {
  // `jti` (UUID) único por token (SB-29). Sin él, dos `jwt.sign` del mismo usuario
  // dentro del MISMO segundo producen bytes idénticos (el payload es igual y el
  // `iat` tiene resolución de 1 s). El refresh token se guarda con una restricción
  // `unique`, así que dos tokens idénticos chocaban: 500 en /login o 401 en
  // /refresh (con el token filtrado en el detalle del error al log). Es alcanzable
  // con uso normal: doble clic en «Entrar», dos pestañas, o una cuenta compartida.
  // Un jti distinto por token lo hace único siempre. Cada token lleva el suyo.
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, jwtid: randomUUID() } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN, jwtid: randomUUID() } as jwt.SignOptions);
  return { accessToken, refreshToken };
};

export const decodeAccessToken = (token: string): (TokenPayload & { exp: number }) | null => {
  try {
    return jwtDecode<TokenPayload & { exp: number }>(token);
  } catch (error) {
    return null;
  }
};

export const verifyAccessToken = (token: string): (TokenPayload & { exp: number }) | null => {
  try {
    // `algorithms: ['HS256']` explícito: no confiar solo en el defecto de la
    // librería. Fija el algoritmo esperado y descarta cualquier otro (incluido
    // 'none' y confusiones RS/HS) — endurecimiento barato frente a token forgery.
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as (TokenPayload & { exp: number });
  } catch (error) {
    return null;
  }
};

export const decodeRefreshToken = (token: string): (TokenPayload & { exp: number }) | null => {
  try {
    return jwtDecode<TokenPayload & { exp: number }>(token);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): (TokenPayload & { exp: number }) | null => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] }) as (TokenPayload & { exp: number });
  } catch (error) {
    return null;
  }
};
