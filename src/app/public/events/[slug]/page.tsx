import React from 'react';
import { notFound } from 'next/navigation';
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
