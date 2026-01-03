import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { guestService } from '@/services/guestService';
import { createGuestSchema } from '@/utils/validators/participantSchemas';

export async function GET(
  _request: Request,
  { params }: { params: { participantId: string } }
) {
  try {
    const { participantId } = params;
    const guests = await guestService.listGuestsByParticipant(participantId);
    return NextResponse.json(guests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { participantId: string } }
) {
  try {
    const { participantId } = params;
    const body = await request.json();

    const validated = createGuestSchema.parse({ ...body, participantId });

    const newGuest = await guestService.addGuest(participantId, {
      ...validated,
      id: randomUUID(),
      isAccredited: false,
    });

    return NextResponse.json(newGuest, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
