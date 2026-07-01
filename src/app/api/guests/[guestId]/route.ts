import { NextResponse } from 'next/server';
import { guestService } from '@/services/guestService';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ guestId: string }> }) => {
  try {
    const { guestId } = await params;
    const body = await req.json();
    const updatedGuest = await guestService.updateGuest(guestId, body, req.user?.id);
    return NextResponse.json(updatedGuest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ guestId: string }> }) => {
  try {
    const { guestId } = await params;
    const reason = new URL(req.url).searchParams.get('reason') || undefined;
    await guestService.deleteGuest(guestId, req.user?.id, reason);
    return NextResponse.json({ message: 'Guest deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);
