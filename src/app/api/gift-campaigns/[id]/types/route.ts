import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { giftService } from '@/services/giftService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

export const GET = withAuth(async (_req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return NextResponse.json(await giftService.listTypes(id));
}, [ADMIN, OPERATOR, MANAGER, GUARD]);

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const t = await giftService.createType(id, body);
    return NextResponse.json(t, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);
