import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';

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
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions);
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
    return jwt.verify(token, JWT_SECRET) as (TokenPayload & { exp: number });
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
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as (TokenPayload & { exp: number });
  } catch (error) {
    return null;
  }
};
