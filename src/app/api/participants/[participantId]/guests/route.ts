import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { guestService } from '@/services/guestService';
import { createGuestSchema } from '@/utils/validators/participantSchemas';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    const guests = await guestService.listGuestsByParticipant(participantId);
    return NextResponse.json(guests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ participantId: string }> }) => {
  try {
    const { participantId } = await params;
    const body = await req.json();

    const validated = createGuestSchema.parse({ ...body, participantId });

    const newGuest = await guestService.addGuest(participantId, {
      ...validated,
      id: randomUUID(),
      isAccredited: false,
    }, req.user?.id);

    return NextResponse.json(newGuest, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);
