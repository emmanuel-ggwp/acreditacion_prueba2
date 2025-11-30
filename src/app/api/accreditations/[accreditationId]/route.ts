
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { accreditationService } from '@/services/accreditationService';
import { AuthenticatedRequest } from '@/types/auth';

interface Params {
  params: { accreditationId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    // Note: accreditationId is UUID (string) in model, but route was parsing as int.
    // I will pass it as string.
    const { accreditationId } = params;
    const accreditation = await accreditationService.getAccreditationById(accreditationId);
    if (!accreditation) {
      return NextResponse.json({ message: 'Accreditation not found' }, { status: 404 });
    }
    return NextResponse.json(accreditation);
  } catch (error: any) {
    console.error(`Error fetching accreditation ${params.accreditationId}:`, error);
    return NextResponse.json({ message: 'Error fetching accreditation', error: error.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { accreditationId } = params;
    const checkedOutBy = req.user.id;
    const accreditation = await accreditationService.checkOut(accreditationId, checkedOutBy);
    return NextResponse.json(accreditation);
  } catch (error: any) {
    console.error(`Error checking out accreditation ${params.accreditationId}:`, error);
    return NextResponse.json({ message: 'Error checking out accreditation', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer', 'staff']);
