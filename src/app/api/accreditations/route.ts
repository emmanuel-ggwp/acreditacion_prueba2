import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { accreditationService } from '@/services/accreditationService';
import { accreditationSchema, bulkAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD } = ROLES;

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { type, id, scheduleId, notes } = body;
    const accreditedBy = req.user.id;
    let accreditation;

    if (type === 'participant') {
      accreditation = await accreditationService.accreditParticipant(id, scheduleId, accreditedBy, notes);
    } else if (type === 'guest') {
      accreditation = await accreditationService.accreditGuest(id, scheduleId, accreditedBy, notes);
    } else {
      return NextResponse.json({ message: 'Invalid accreditation type' }, { status: 400 });
    }

    return NextResponse.json(accreditation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const filters = {
      eventId: searchParams.get('eventId') || undefined,
      scheduleId: searchParams.get('scheduleId') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : undefined,
    };

    const accreditations = await accreditationService.listAccreditations(filters);
    return NextResponse.json(accreditations);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validatedData = bulkAccreditationSchema.parse(body);
    const accreditedBy = req.user.id;

    const results = await accreditationService.bulkAccredit(validatedData, accreditedBy);

    return NextResponse.json(results);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
