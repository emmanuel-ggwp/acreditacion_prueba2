import React from 'react';
import { notFound } from 'next/navigation';
import { CalendarCheck } from 'lucide-react';
import { Event, EventSchedule, EmailTemplate } from '@/models/index';
import { templates, TemplateType } from '@/components/public/templates';
import RegistrationClosed from '@/components/public/RegistrationClosed';
import { annotateEventCapacity } from '@/services/capacityService';

// Force dynamic rendering since we rely on DB data that changes
export const dynamic = 'force-dynamic';

async function getEvent(slug: string) {
  try {
    const event = await Event.findOne({
      where: { 
        publicSlug: slug,
        isActive: true,
        isPublic: true
      },
      include: [
        {
          model: EventSchedule,
          as: 'schedules',
          required: false
        }
      ],
      // Fechas ordenadas cronológicamente (la landing las muestra en este orden).
      order: [[{ model: EventSchedule, as: 'schedules' }, 'startDateTime', 'ASC']],
    });

    if (!event) return null;

    const plain: any = event.get({ plain: true });
    // Resolver la plantilla de correo (para enviar EmailJS desde el cliente)
    if (plain.emailTemplateId) {
      const tpl = await EmailTemplate.findByPk(plain.emailTemplateId);
      plain.emailTemplate = tpl ? { templateId: tpl.templateId, name: tpl.name } : null;
    }
    // Info de capacidad (evento lleno + cupos por fecha) para la landing.
    await annotateEventCapacity(plain);
    return plain;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  // Evento finalizado: TODAS las fechas ya pasaron. Tiene prioridad sobre el resto
  // (cerrado / lleno) porque el evento ya se realizó; da igual el estado de la
  // inscripción. Un evento sin fechas nunca se considera finalizado.
  const schedules = Array.isArray(event.schedules) ? event.schedules : [];
  const now = Date.now();
  const eventFinished =
    schedules.length > 0 &&
    schedules.every((s: any) => {
      const end = new Date(s.endDateTime).getTime();
      return Number.isFinite(end) && end < now;
    });
  if (eventFinished) {
    return (
      <RegistrationClosed
        event={event}
        icon={CalendarCheck}
        title="Evento finalizado"
        message="Este evento ya se realizó. ¡Gracias por acompañarnos!"
      />
    );
  }

  // Inscripción cerrada: el enlace sigue activo pero no se muestra el formulario.
  if (event.registrationOpen === false) {
    return <RegistrationClosed event={event} />;
  }

  // Capacidad máxima del evento alcanzada: no se muestra el formulario.
  if (event.eventFull) {
    return (
      <RegistrationClosed
        event={event}
        title="Cupos agotados"
        message="La capacidad máxima del evento ha sido alcanzada. Ya no hay cupos disponibles para inscribirse."
      />
    );
  }

  const templateName = (event.publicTemplate as TemplateType) || 'default';
  const TemplateComponent = templates[templateName] || templates.default;

  return <TemplateComponent event={event} slug={slug} />;
}
