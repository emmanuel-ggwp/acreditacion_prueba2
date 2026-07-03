import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { giftService } from '@/services/giftService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

export const GET = withAuth(async (_req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const campaign = await giftService.getCampaign(id);
    if (!campaign) return NextResponse.json({ message: 'Campaña no encontrada' }, { status: 404 });
    const [types, summary] = await Promise.all([giftService.listTypes(id), giftService.summary(id)]);
    return NextResponse.json({ campaign, types, summary });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER, GUARD]);

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const c = await giftService.updateCampaign(id, body);
    return NextResponse.json(c);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);

export const DELETE = withAuth(async (_req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await giftService.deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);
