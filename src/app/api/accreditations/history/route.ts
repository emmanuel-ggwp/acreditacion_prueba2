import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { verifyAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import { attendanceHistoryService, AttendanceHistoryError } from '@/services/attendanceHistoryService';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const params = new URL(req.url).searchParams;
    const { type, id, scheduleId } = verifyAccreditationSchema.parse({
      type: params.get('type'), id: params.get('id'), scheduleId: params.get('scheduleId'),
    });
    return NextResponse.json({ history: await attendanceHistoryService.getHistory(type, id, scheduleId) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Datos de historial inválidos.', errors: error.issues }, { status: 400 });
    if (error instanceof AttendanceHistoryError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    console.error('Error al consultar historial de asistencia:', error);
    return NextResponse.json({ message: 'No se pudo consultar el historial de asistencia.' }, { status: 500 });
  }
}, [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD]);
