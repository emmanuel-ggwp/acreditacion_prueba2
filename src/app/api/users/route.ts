import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { userService } from '@/services/userService';

const { ADMIN } = ROLES;

export const GET = withAuth(async () => {
  const users = await userService.list();
  return NextResponse.json(users);
}, [ADMIN]);

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const user = await userService.create(body, req.user?.id);
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN]);
