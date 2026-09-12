
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

  const tokenUser = decoded as { id: string; role: Role };

  // Vigencia + ROL contrastados contra la BD (F3-09/SB-06 + F3-10/SB-07). El token
  // ya está verificado criptográficamente arriba; la BD es la FUENTE DE VERDAD para:
  //  - que la cuenta EXISTA (no borrada) y esté ACTIVA (no deshabilitada) — cortar
  //    una sesión en curso de inmediato, no solo impedir renovar el token; y
  //  - el ROL, de modo que degradar o revocar permisos surta efecto en la SIGUIENTE
  //    petición y no cuando caduque el access token (que puede durar días).
  //
  // FALLA CERRADO: si la consulta no se puede ejecutar, se DENIEGA (503). Antes el
  // `catch` vacío dejaba pasar la petición —un error de base de datos se traducía en
  // acceso concedido, con un token quizá ya revocado—. Denegar es lo correcto y,
  // además, sin BD el handler no podría hacer nada útil de todos modos.
  //
  // La autorización por rol se hace DESPUÉS de leer la BD, sobre el rol de la BD y
  // no el del token; por eso también una petición sin permiso pasa por esta consulta.
  let dbRole: Role;
  try {
    const dbUser = await User.findByPk(tokenUser.id, { attributes: ['id', 'isActive', 'role'] });
    if (!dbUser) {
      return NextResponse.json({ message: 'Sesión inválida. Vuelve a iniciar sesión.' }, { status: 401 });
    }
    // Solo `=== false` (deshabilitado a propósito): un `isActive` nulo heredado no
    // debe expulsar a un usuario legítimo.
    if (dbUser.isActive === false) {
      return NextResponse.json({ message: 'Cuenta deshabilitada.' }, { status: 403 });
    }
    dbRole = dbUser.role as Role;
  } catch (e) {
    console.error('withAuth: no se pudo verificar la vigencia del usuario en la BD', e);
    return NextResponse.json({ message: 'Servicio no disponible temporalmente.' }, { status: 503 });
  }

  if (!allowedRoles.includes(dbRole)) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const authenticatedRequest = req as AuthenticatedRequest;
  // El rol que ve el handler es el de la BD (actual), no el (posiblemente viejo) del token.
  authenticatedRequest.user = { id: tokenUser.id, role: dbRole };

  return handler(authenticatedRequest, context);
};

export const withAuth = (handler: AppRouterHandler, allowedRoles: Role[] = [ROLES.ADMIN]): ((req: NextRequest, context: { params: any }) => Promise<NextResponse>) => {
  return roleGuard(allowedRoles)(handler);
};

