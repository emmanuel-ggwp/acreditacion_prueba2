import React from 'react';
import { notFound } from 'next/navigation';
import { Event, EventSchedule } from '@/models/index';
import { templates, TemplateType } from '@/components/public/templates';

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
    
    return event.get({ plain: true });
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

  const templateName = (event.publicTemplate as TemplateType) || 'default';
  const TemplateComponent = templates[templateName] || templates.default;

  return <TemplateComponent event={event} slug={slug} />;
}
