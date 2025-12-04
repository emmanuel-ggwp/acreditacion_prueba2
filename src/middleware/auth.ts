
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';
import { Role, ROLES } from '@/utils/constants';

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

  const authenticatedRequest = req as AuthenticatedRequest;
  authenticatedRequest.user = user;

  return handler(authenticatedRequest, context);
};

export const withAuth = (handler: AppRouterHandler, allowedRoles: Role[] = [ROLES.ADMIN]): ((req: NextRequest, context: { params: any }) => Promise<NextResponse>) => {
  return roleGuard(allowedRoles)(handler);
};

