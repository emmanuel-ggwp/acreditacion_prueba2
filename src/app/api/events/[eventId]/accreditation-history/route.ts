import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { accreditationService } from '@/services/accreditationService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, MANAGER, OPERATOR } = ROLES;

interface Params {
  params: Promise<{ eventId: string }>;
}

// Historial de acreditación del evento (quién acreditó/des-acreditó a quién, hora,
// fecha y si es premiado). Construido desde el log de auditoría.
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { eventId } = await params;
    if (!eventId?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const history = await accreditationService.getEventAccreditationHistory(eventId, { scheduleId, limit });
    return NextResponse.json(history);
  } catch (e: any) {
    console.error('Error fetching accreditation history:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, MANAGER, OPERATOR]);
