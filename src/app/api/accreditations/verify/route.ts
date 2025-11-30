
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { verifyAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import { accreditationService } from '@/services/accreditationService';
import { AuthenticatedRequest } from '@/types/auth';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { type, id, scheduleId } = verifyAccreditationSchema.parse(body);
    
    const result = await accreditationService.verifyAccreditation(type, id, scheduleId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error verifying accreditation:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error verifying accreditation', error: error.message }, { status: 500 });
  }
});
