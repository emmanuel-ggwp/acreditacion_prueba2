'use client';

import React, { useState } from 'react';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { hexToRgba } from '@/utils/color';
import { CONTACT_EMAIL } from '@/utils/contact';
import { getTitleFont, googleFontHref } from '@/utils/fonts';

interface TemplateProps {
  event: any;
  slug: string;
}

export default function ModernTemplate({ event, slug }: TemplateProps) {
  const theme = (event.registrationConfig && event.registrationConfig.theme) || {};
  const primary: string = theme.primaryColor || '#7c93b3';
  const secondary: string = theme.secondaryColor || '#475569';
  const formBg: string = theme.formBackgroundColor || '#ffffff';
  const hasBg = !!event.backgroundImageUrl;
  const overlayColor: string = theme.overlayColor || '#0f172a';
  const overlay = typeof theme.overlayOpacity === 'number' ? theme.overlayOpacity : 0.6;
  const first = Array.isArray(event.schedules) ? event.schedules[0] : null;
  const [selectedSchedules, setSelectedSchedules] = useState<any[]>([]);
  const headerSel = selectedSchedules[0];
  const titleFont = getTitleFont(event.registrationConfig, 'modern');
  const fontHref = googleFontHref(titleFont);

  const leftStyle: React.CSSProperties = hasBg
    ? { backgroundImage: `url(${event.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#1e293b' };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col lg:flex-row">
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {/* Panel izquierdo - Info */}
      <div className="lg:w-1/3 p-8 sm:p-10 lg:p-12 flex flex-col justify-center relative overflow-hidden" style={leftStyle}>
        {hasBg && <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, overlay) }} aria-hidden="true" />}
        <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }} />

        <div className="relative z-10">
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-14 w-auto mb-8 drop-shadow-lg" />
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 tracking-tight break-words" style={{ fontFamily: titleFont.stack }}>{event.name}</h1>

          {event.description && (
            <div className="mb-8 text-slate-200/90">
              <p>{event.description}</p>
            </div>
          )}

          <div className="space-y-4 text-slate-200">
            {headerSel ? (
              <>
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5" style={{ color: primary }} />
                  <span>
                    {new Date(headerSel.startDateTime).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-3 h-5 w-5" style={{ color: primary }} />
                  <span>{new Date(headerSel.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </>
            ) : (event.schedules?.length || 0) > 1 ? (
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5" style={{ color: primary }} />
                <span>Elige tu fecha</span>
              </div>
            ) : null}
            {event.location && (
              <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5" style={{ color: primary }} />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Círculos decorativos (solo sin imagen de fondo) */}
        {!hasBg && (
          <>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: primary }} />
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: secondary }} />
          </>
        )}
      </div>

      {/* Panel derecho - Formulario */}
      <div className="lg:w-2/3 text-slate-900 p-6 sm:p-8 lg:p-12 overflow-y-auto" style={{ backgroundColor: formBg }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Asegura tu lugar</h2>
            <p className="text-slate-500">Completa el formulario a continuación para registrarte.</p>
          </div>
          <PublicRegistrationForm event={event} slug={slug} onSelectedSchedulesChange={setSelectedSchedules} />
          <p className="mt-8 text-center text-xs text-slate-500">
            ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium" style={{ color: primary }}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
