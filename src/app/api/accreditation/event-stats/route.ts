import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { accreditationService } from '@/services/accreditationService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

// Resumen de asistencia por fecha del evento (participantes/invitados/total por horario + totales).
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const eventId = new URL(req.url).searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ message: 'eventId requerido' }, { status: 400 });
    }
    const stats = await accreditationService.getEventScheduleStats(eventId);
    return NextResponse.json(stats);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER, GUARD]);
