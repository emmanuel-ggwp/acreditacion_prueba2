
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { assignAwardSchema } from '@/utils/validators/awardSchemas';
import { participantAwardService } from '@/services/participantAwardService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: Promise<{ awardId: string }>;
}

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { awardId } = await params;
    if (!awardId?.length) {
      return NextResponse.json({ message: 'Invalid award ID' }, { status: 400 });
    }
    const body = await req.json();
    const { participantId } = assignAwardSchema.parse(body);
    const notes = (body as any)?.notes;
    const assignedBy = req.user.id;

    const assignment = await participantAwardService.assignAward(participantId, awardId, assignedBy, notes);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any)
{
    console.error('Error assigning award:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error assigning award', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
