
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

  // El usuario del token debe seguir existiendo en la BD. Evita errores de llave
  // foránea (created_by / accredited_by) por sesiones viejas tras regenerar usuarios:
  // un 401 aquí hace que el cliente intente refrescar, falle y te mande al login.
  try {
    const dbUser = await User.findByPk(user.id, { attributes: ['id'] });
    if (!dbUser) {
      return NextResponse.json({ message: 'Sesión inválida. Vuelve a iniciar sesión.' }, { status: 401 });
    }
  } catch {
    // Si la verificación falla por un problema transitorio de BD, no bloqueamos la petición.
  }

  const authenticatedRequest = req as AuthenticatedRequest;
  authenticatedRequest.user = user;

  return handler(authenticatedRequest, context);
};

export const withAuth = (handler: AppRouterHandler, allowedRoles: Role[] = [ROLES.ADMIN]): ((req: NextRequest, context: { params: any }) => Promise<NextResponse>) => {
  return roleGuard(allowedRoles)(handler);
};

