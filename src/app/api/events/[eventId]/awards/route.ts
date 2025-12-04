
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { createAwardSchema } from '@/utils/validators/awardSchemas';
import { awardService } from '@/services/awardService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { eventId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const awards = await awardService.listAwardsByEvent(eventId);
    return NextResponse.json(awards);
  } catch (error: any) {
    console.error(`Error fetching awards for event ${params.eventId}:`, error);
    return NextResponse.json({ message: 'Error fetching awards', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const body = await req.json();
    const validatedData = createAwardSchema.parse(body);
    const award = await awardService.createAward(eventId, validatedData, req.user.id);
    return NextResponse.json(award, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating award for event ${params.eventId}:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating award', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
