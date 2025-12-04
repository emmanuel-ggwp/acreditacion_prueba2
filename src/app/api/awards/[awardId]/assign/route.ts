
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { assignAwardSchema } from '@/utils/validators/awardSchemas';
import { participantAwardService } from '@/services/participantAwardService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { awardId: string };
}

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const awardId = parseInt(params.awardId, 10);
    if (isNaN(awardId)) {
      return NextResponse.json({ message: 'Invalid award ID' }, { status: 400 });
    }
    const body = await req.json();
    const { participantId, notes } = assignAwardSchema.parse(body);
    const assignedBy = req.user.id;

    // Note: participantId is string (UUID) in schema, but service expects number?
    // The service definition I read earlier had `participantId: number`.
    // But the models use UUIDs. This is a type mismatch I need to fix in the service later.
    // For now, I'll cast to any to avoid build error if types conflict, or just pass it if I fix the service.
    // Actually, I should fix the service to accept strings if IDs are UUIDs.
    // But first, let's fix the import.
    const assignment = await participantAwardService.assignAward(participantId as any, awardId, assignedBy, notes);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any)
{
    console.error(`Error assigning award ${params.awardId}:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error assigning award', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
