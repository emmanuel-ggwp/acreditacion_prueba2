
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { eventScheduleService } from '@/services/eventScheduleService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: Promise<{ eventId: string; scheduleId: string }>;
}

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { scheduleId } = await params;
    if (!scheduleId?.length) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    const body = await req.json();
    const validatedData = updateScheduleSchema.parse(body);
    const updatedSchedule = await eventScheduleService.updateSchedule(scheduleId, validatedData, req.user?.id);
    return NextResponse.json(updatedSchedule);
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    // Errores de regla de negocio (capacidad, acreditaciones existentes, etc.) → 400 con el mensaje.
    return NextResponse.json({ message: error.message || 'Error updating schedule' }, { status: 400 });
  }
}, [ADMIN, OPERATOR]);

// Abrir / cerrar acreditación de un horario (cambia solo el estado).
// GUARDIA (rol de puerta) SOLO puede abrir/cerrar acreditación
// (published/accrediting/accredited). Cancelar un horario y cambiar su imagen son
// acciones administrativas reservadas a ADMIN/OPERATOR.
const GUARD_ALLOWED_STATUSES = ['published', 'accrediting', 'accredited'];
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { scheduleId } = await params;
    const body = await req.json();
    const isGuard = req.user?.role === GUARD;
    let updated;
    if (typeof body.imageUrl !== 'undefined') {
      if (isGuard) {
        return NextResponse.json({ message: 'No autorizado para cambiar la imagen del horario' }, { status: 403 });
      }
      updated = await eventScheduleService.setImage(scheduleId, body.imageUrl, req.user?.id);
    } else if (body.status) {
      if (isGuard && !GUARD_ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ message: 'No autorizado para cambiar a ese estado' }, { status: 403 });
      }
      updated = await eventScheduleService.setStatus(scheduleId, body.status, req.user?.id);
    } else {
      return NextResponse.json({ message: 'Nada que actualizar' }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}, [ADMIN, OPERATOR, GUARD]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { scheduleId } = await params;
    if (!scheduleId?.length) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    const reason = new URL(req.url).searchParams.get('reason') || undefined;
    await eventScheduleService.deleteSchedule(scheduleId, req.user?.id, reason);
    return NextResponse.json({ message: 'Schedule deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ message: 'Error deleting schedule', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
