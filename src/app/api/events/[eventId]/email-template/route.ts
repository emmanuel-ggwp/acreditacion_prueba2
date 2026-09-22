import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { getGuestMode } from '@/utils/formFields';
import { Event, EmailTemplate } from '@/models/index';

const { ADMIN, OPERATOR } = ROLES;

// Resuelve el templateId de EmailJS del evento (Event.emailTemplateId -> EmailTemplate)
// para poder (re)enviar el correo desde el navegador del admin, junto con datos básicos
// del evento que van en los parámetros de la plantilla.
export const GET = withAuth(async (
  _req: AuthenticatedRequest,
  { params }: { params: Promise<{ eventId: string }> }
) => {
  try {
    const { eventId } = await params;
    const event: any = await Event.findByPk(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    let templateId: string | null = null;
    if (event.emailTemplateId) {
      const tpl: any = await EmailTemplate.findByPk(event.emailTemplateId);
      templateId = tpl?.templateId || null;
    }
    return NextResponse.json({
      templateId,
      eventName: event.name,
      location: event.location || '',
      guestMode: getGuestMode(event.registrationConfig),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
