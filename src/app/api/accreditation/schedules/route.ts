import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { eventService } from '@/services/eventService';
import { eventScheduleService } from '@/services/eventScheduleService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

// Horarios activos para acreditar (en acreditación ahora + publicados de hoy), con cupo.
export const GET = withAuth(async (_req: AuthenticatedRequest) => {
  try {
    await eventService.refreshScheduleStatuses();
    const schedules = await eventScheduleService.getActiveSchedules();
    return NextResponse.json(schedules);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER, GUARD]);
