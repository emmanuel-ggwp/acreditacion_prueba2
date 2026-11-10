import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { ticketService, TicketError } from '@/services/ticketService';

const roles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD];
const ids = z.object({ participantId: z.guid(), scheduleId: z.guid() });
const submission = ids.extend({ quantity: z.number().int().min(1).max(10000) });
type Context = { params: Promise<{ participantId: string }> };

function failure(error: unknown) {
  if (error instanceof SyntaxError) return NextResponse.json({ message: 'Cuerpo JSON inválido.' }, { status: 400 });
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Datos de tickets inválidos.', errors: error.issues }, { status: 400 });
  if (error instanceof TicketError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
  console.error('Error en entrega de tickets:', error);
  return NextResponse.json({ message: 'No se pudo procesar la entrega de tickets.' }, { status: 500 });
}

export const GET = withAuth(async (req: AuthenticatedRequest, context: Context) => {
  try {
    const { participantId } = await context.params;
    const data = ids.parse({ participantId, scheduleId: new URL(req.url).searchParams.get('scheduleId') });
    return NextResponse.json(await ticketService.getStatus(data.participantId, data.scheduleId));
  } catch (error) { return failure(error); }
}, roles);

export const POST = withAuth(async (req: AuthenticatedRequest, context: Context) => {
  try {
    const { participantId } = await context.params;
    const data = submission.parse({ ...await req.json(), participantId });
    return NextResponse.json(await ticketService.deliver(data.participantId, data.scheduleId, data.quantity, req.user.id), { status: 201 });
  } catch (error) { return failure(error); }
}, roles);
