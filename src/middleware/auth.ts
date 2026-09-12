
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';
import { Role, ROLES } from '@/utils/constants';
import User from '@/models/User';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    role: Role;
  };
}

type AppRouterHandler = (req: AuthenticatedRequest, context: { params: any }) => Promise<NextResponse>;

type RoleGuard = (allowedRoles: Role[]) => (handler: AppRouterHandler) => (req: NextRequest, context: { params: any }) => Promise<NextResponse>;

const roleGuard: RoleGuard = (allowedRoles) => (handler) => async (req, context) => {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  const user = decoded as { id: string; role: Role };

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  // Comprobación de revocación (F3-09 / SB-06). El token ya está verificado
  // criptográficamente arriba; esto contrasta contra la BD que la cuenta siga
  // vigente: que EXISTA (no borrada) y esté ACTIVA (no deshabilitada). Desactivar a
  // alguien corta así su sesión en curso de inmediato, no solo le impide renovar el
  // token (respuesta a incidentes).
  //
  // FALLA CERRADO: si la consulta no se puede ejecutar, se DENIEGA (503). Antes el
  // `catch` vacío dejaba pasar la petición —un error de base de datos se traducía en
  // acceso concedido, justo con un token que quizá estaba revocado—. Denegar es lo
  // correcto y, además, sin BD el handler no podría hacer nada útil de todos modos.
  //
  // (El ROL se sigue tomando del token; releerlo de la BD para que un cambio de rol
  // surta efecto al instante es SB-07, un cambio aparte.)
  try {
    const dbUser = await User.findByPk(user.id, { attributes: ['id', 'isActive'] });
    if (!dbUser) {
      return NextResponse.json({ message: 'Sesión inválida. Vuelve a iniciar sesión.' }, { status: 401 });
    }
    // Solo `=== false` (deshabilitado a propósito): un `isActive` nulo heredado no
    // debe expulsar a un usuario legítimo.
    if (dbUser.isActive === false) {
      return NextResponse.json({ message: 'Cuenta deshabilitada.' }, { status: 403 });
    }
  } catch (e) {
    console.error('withAuth: no se pudo verificar la vigencia del usuario en la BD', e);
    return NextResponse.json({ message: 'Servicio no disponible temporalmente.' }, { status: 503 });
  }

  const authenticatedRequest = req as AuthenticatedRequest;
  authenticatedRequest.user = user;

  return handler(authenticatedRequest, context);
};

export const withAuth = (handler: AppRouterHandler, allowedRoles: Role[] = [ROLES.ADMIN]): ((req: NextRequest, context: { params: any }) => Promise<NextResponse>) => {
  return roleGuard(allowedRoles)(handler);
};

