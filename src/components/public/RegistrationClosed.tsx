import React from 'react';
import { CalendarX2, type LucideIcon } from 'lucide-react';
import { CONTACT_EMAIL } from '@/utils/contact';

interface RegistrationClosedProps {
  event: {
    name?: string;
    logoUrl?: string | null;
    backgroundImageUrl?: string | null;
  };
  title?: string;
  message?: React.ReactNode;
  /** Icono mostrado cuando el evento no tiene logo (por defecto un calendario tachado). */
  icon?: LucideIcon;
}

/**
 * Pantalla de aviso a pantalla completa para la landing pública: inscripción
 * cerrada, cupos agotados, evento finalizado o evento no encontrado. El enlace
 * sigue funcionando, pero no se muestra el formulario. Reutiliza, si existen, el
 * logo, la imagen de fondo y el nombre del evento; si no, muestra el icono. Es
 * responsive y siempre ofrece el correo de contacto.
 */
export default function RegistrationClosed({ event, title, message, icon }: RegistrationClosedProps) {
  const hasBackground = !!event?.backgroundImageUrl;
  const Icon = icon || CalendarX2;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200"
      style={
        hasBackground
          ? {
              backgroundImage: `url(${event.backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Capa oscura para legibilidad sobre la imagen de fondo */}
      {hasBackground && <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />}

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-black/5 p-8 sm:p-10 text-center">
          {event?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.logoUrl}
              alt={event?.name || 'Logo del evento'}
              className="mx-auto h-16 w-auto object-contain mb-6"
            />
          ) : (
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Icon className="h-8 w-8" />
            </div>
          )}

          {event?.name && (
            <p className="text-sm font-medium uppercase tracking-wider text-indigo-600 mb-2">
              {event.name}
            </p>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {title || 'Inscripciones cerradas'}
          </h1>

          <p className="text-base text-gray-600 leading-relaxed">
            {message || (
              <>
                Las inscripciones para este evento ya se encuentran cerradas.
                <br className="hidden sm:block" />
                Gracias por tu interés.
              </>
            )}
          </p>

          <p className="mt-5 text-sm text-gray-500">
            ¿Dudas? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline font-medium">{CONTACT_EMAIL}</a>
          </p>

          <div className="mt-8 h-1 w-16 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
        </div>
      </div>
    </div>
  );
}
