'use client';

import React, { useState } from 'react';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';
import { Calendar, MapPin } from 'lucide-react';
import { CONTACT_EMAIL } from '@/utils/contact';
import { getTitleFont, googleFontHref } from '@/utils/fonts';

interface TemplateProps {
  event: any;
  slug: string;
}

export default function DefaultTemplate({ event, slug }: TemplateProps) {
  const theme = (event.registrationConfig && event.registrationConfig.theme) || {};
  const primary = theme.primaryColor || '#1e293b';
  const formBg = theme.formBackgroundColor || '#ffffff';
  const textColor = theme.textColor || '#111827';
  const hasBg = !!event.backgroundImageUrl;
  const overlay = typeof theme.overlayOpacity === 'number' ? theme.overlayOpacity : 0.5;
  const [selectedSchedules, setSelectedSchedules] = useState<any[]>([]);
  const headerSel = selectedSchedules[0];
  const titleFont = getTitleFont(event.registrationConfig, 'default');
  const fontHref = googleFontHref(titleFont);

  return (
    <div
      className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={hasBg
        ? { backgroundImage: `url(${event.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: '#f9fafb' }}
    >
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {hasBg && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlay})` }} aria-hidden="true" />
      )}

      <div className="relative max-w-3xl mx-auto">
        {event.logoUrl && (
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.logoUrl} alt={event.name} className="h-20 w-auto object-contain drop-shadow" />
          </div>
        )}

        <div className="shadow-xl rounded-2xl overflow-hidden" style={{ backgroundColor: formBg }}>
          {/* Header / Banner */}
          <div className="px-6 py-8 sm:px-8 sm:py-10 text-white" style={{ backgroundColor: primary }}>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words" style={{ fontFamily: titleFont.stack }}>{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-white/80 text-sm font-medium">
              {headerSel ? (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  {new Date(headerSel.startDateTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              ) : (event.schedules && event.schedules.length > 1) ? (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Elige tu fecha
                </div>
              ) : null}
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {event.location}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-7 sm:px-8 sm:py-8" style={{ color: textColor }}>
            {event.description && (
              <div className="prose mb-8" style={{ color: textColor }}>
                <p>{event.description}</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-8">
              <h2 className="text-xl font-semibold mb-6" style={{ color: textColor }}>Regístrate en este evento</h2>
              <PublicRegistrationForm event={event} slug={slug} onSelectedSchedulesChange={setSelectedSchedules} />
            </div>
          </div>
        </div>

        <p className={`mt-6 text-center text-xs ${hasBg ? 'text-white/80' : 'text-gray-500'}`}>
          ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium">{CONTACT_EMAIL}</a>
        </p>
      </div>
    </div>
  );
}
