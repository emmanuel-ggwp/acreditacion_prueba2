import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { giftService } from '@/services/giftService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

export const GET = withAuth(async () => {
  const campaigns = await giftService.listCampaigns();
  return NextResponse.json(campaigns);
}, [ADMIN, OPERATOR, MANAGER, GUARD]);

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    if (!body?.name) return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
    const c = await giftService.createCampaign(body.name);
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
