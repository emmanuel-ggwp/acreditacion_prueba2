import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Event, Participant } from '@/models/index';
import { limitPublicRegister } from '@/lib/rate-limit';

// El correo de confirmación se envía best-effort desde el navegador (EmailJS). Este
// endpoint recibe el RESULTADO de ese envío para persistirlo en el participante, de modo
// que el panel pueda mostrar si el correo salió o falló. Solo actualiza el estado de
// correo de un participante que pertenezca a este evento público (dato de baja
// sensibilidad); va con el mismo rate-limit del registro público.
const bodySchema = z.object({
  participantId: z.guid(),
  ok: z.boolean(),
  skipped: z.boolean().optional(),
  error: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await limitPublicRegister(request);
  if (limited) return limited;

  try {
    const { slug } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const { participantId, ok, skipped, error } = parsed.data;

    const event = await Event.findOne({ where: { publicSlug: slug, isActive: true, isPublic: true } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found or not public' }, { status: 404 });
    }

    const participant = await Participant.findByPk(participantId);
    if (!participant || participant.eventId !== event.id) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const update = ok
      ? { emailStatus: 'sent' as const, emailSentAt: new Date(), emailError: null }
      : skipped
        ? { emailStatus: 'skipped' as const, emailError: null }
        : { emailStatus: 'failed' as const, emailError: (error || 'Error desconocido al enviar correo').slice(0, 1000) };

    await participant.update(update);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
