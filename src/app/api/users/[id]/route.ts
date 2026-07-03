import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { userService } from '@/services/userService';

const { ADMIN } = ROLES;

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const user = await userService.update(id, body, req.user?.id);
    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const reason = new URL(req.url).searchParams.get('reason') || undefined;
    await userService.remove(id, req.user?.id, reason);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN]);
