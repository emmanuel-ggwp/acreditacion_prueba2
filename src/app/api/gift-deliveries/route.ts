import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { giftService } from '@/services/giftService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

// Registrar entrega: { employeeId, giftTypeId, deliveredQty }
export const POST = withAuth(async (req: AuthenticatedRequest, _ctx: any) => {
  try {
    const body = await req.json();
    if (!body?.employeeId || !body?.giftTypeId) {
      return NextResponse.json({ message: 'employeeId y giftTypeId son obligatorios' }, { status: 400 });
    }
    const d = await giftService.setDelivery(body.employeeId, body.giftTypeId, body.deliveredQty, req.user?.id);
    return NextResponse.json(d);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, MANAGER, GUARD]);
