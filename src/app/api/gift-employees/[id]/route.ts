import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { giftService } from '@/services/giftService';

const { ADMIN, OPERATOR, GUARD } = ROLES;

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const e = await giftService.updateEmployee(id, body);
    return NextResponse.json(e);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);

export const DELETE = withAuth(async (_req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await giftService.deleteEmployee(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);
