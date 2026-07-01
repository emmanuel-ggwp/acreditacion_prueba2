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

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return ''; }
};
const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

export default function MinimalTemplate({ event, slug }: TemplateProps) {
  const theme = (event.registrationConfig && event.registrationConfig.theme) || {};
  const primary: string = theme.primaryColor || '#111827';
  const formBg: string = theme.formBackgroundColor || '#ffffff';
  const hasBg = !!event.backgroundImageUrl;
  // Velo configurable sobre la foto (por defecto claro, para que el texto oscuro siga legible).
  const overlayColor: string = theme.overlayColor || '#ffffff';
  const veilAlpha = typeof theme.overlayOpacity === 'number' ? theme.overlayOpacity : 0.78;
  const schedules: any[] = Array.isArray(event.schedules) ? event.schedules : [];
  const [selectedSchedules, setSelectedSchedules] = useState<any[]>([]);
  const headerSel = selectedSchedules[0];
  const titleFont = getTitleFont(event.registrationConfig, 'minimal');
  const fontHref = googleFontHref(titleFont);

  const chip = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm';

  const pageStyle: React.CSSProperties = hasBg
    ? { backgroundImage: `url(${event.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : { background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' };

  return (
    <div className="min-h-screen relative" style={pageStyle}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {hasBg && <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, veilAlpha) }} aria-hidden="true" />}

      <div className="relative">
        <div style={{ height: 4, backgroundColor: primary }} />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <header className="text-center mb-10">
            {event.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-6 drop-shadow-sm" />
            )}
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 break-words" style={{ fontFamily: titleFont.stack }}>{event.name}</h1>
            {event.description && (
              <p className="mt-3 text-slate-600 max-w-xl mx-auto leading-relaxed">{event.description}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {headerSel ? (
                <>
                  <span className={chip}>
                    <Calendar className="h-4 w-4" style={{ color: primary }} /> <span className="capitalize">{fmtDate(headerSel.startDateTime)}</span>
                  </span>
                  <span className={chip}>
                    <Clock className="h-4 w-4" style={{ color: primary }} /> {fmtTime(headerSel.startDateTime)} – {fmtTime(headerSel.endDateTime)}
                  </span>
                </>
              ) : schedules.length > 1 ? (
                <span className={chip}>
                  <Calendar className="h-4 w-4" style={{ color: primary }} /> Elige tu fecha
                </span>
              ) : null}
              {event.location && (
                <span className={chip}>
                  <MapPin className="h-4 w-4" style={{ color: primary }} /> {event.location}
                </span>
              )}
            </div>
          </header>

          <div className="rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8" style={{ backgroundColor: formBg }}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Inscripción</h2>
              <p className="text-sm text-slate-500 mt-0.5">Completa tus datos para registrarte en el evento.</p>
            </div>
            <PublicRegistrationForm event={event} slug={slug} onSelectedSchedulesChange={setSelectedSchedules} />
          </div>

          <p className="mt-10 text-center text-sm text-slate-600">
            ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium" style={{ color: primary }}>{CONTACT_EMAIL}</a>
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} {event.name}
          </p>
        </div>
      </div>
    </div>
  );
}
