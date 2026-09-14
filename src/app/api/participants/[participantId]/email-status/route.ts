import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { Participant } from '@/models/index';

const { ADMIN, OPERATOR } = ROLES;

// Registra el resultado de un (re)envío de correo hecho desde el navegador del admin.
const schema = z.object({
  ok: z.boolean(),
  skipped: z.boolean().optional(),
  error: z.string().max(1000).optional(),
});

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ participantId: string }> }
) => {
  try {
    const { participantId } = await params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }
    const { ok, skipped, error } = parsed.data;
    const participant = await Participant.findByPk(participantId);
    if (!participant) {
      return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
    }
    const update = ok
      ? { emailStatus: 'sent' as const, emailSentAt: new Date(), emailError: null }
      : skipped
        ? { emailStatus: 'skipped' as const, emailError: null }
        : { emailStatus: 'failed' as const, emailError: (error || 'Error desconocido al enviar correo').slice(0, 1000) };
    await participant.update(update);
    return NextResponse.json({ ok: true, emailStatus: update.emailStatus });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
