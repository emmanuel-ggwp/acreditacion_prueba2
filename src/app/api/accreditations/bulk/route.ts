
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { bulkAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import { accreditationService } from '@/services/accreditationService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validatedData = bulkAccreditationSchema.parse(body);
    const accreditedBy = req.user.id;

    const results = await accreditationService.bulkAccredit(validatedData, accreditedBy);
    return NextResponse.json(results, { status: 201 });
  } catch (error: any) {
    console.error('Error in bulk accreditation:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error in bulk accreditation', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
