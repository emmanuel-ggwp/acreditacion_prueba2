import React from 'react';
import { Rocket, CalendarPlus } from 'lucide-react';

/**
 * Cabecera del panel: muestra arriba la cantidad de eventos activos con un empujón
 * de ánimo (sin pasarse de dulce). `activeEvents === null` = aún cargando.
 * Responsive: en móvil se oculta el icono y el texto baja de tamaño.
 */
export default function DashboardHero({ activeEvents }: { activeEvents: number | null }) {
  const hasActive = (activeEvents ?? 0) > 0;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-sm">
      <div className="p-5 sm:p-8 flex items-center gap-4 sm:gap-6">
        <div className="hidden sm:flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
          {hasActive ? <Rocket className="h-7 w-7" /> : <CalendarPlus className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-100/90">
            Grupo Lo Castillo
          </p>
          {activeEvents === null ? (
            <>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight">Cargando el panel…</h1>
              <p className="mt-1 text-sm sm:text-base text-indigo-100/90">Un momento.</p>
            </>
          ) : hasActive ? (
            <>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight">
                {activeEvents} {activeEvents === 1 ? 'evento activo' : 'eventos activos'}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-indigo-100/90">Vamos con todo, equipo.</p>
            </>
          ) : (
            <>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight">Sin eventos activos por ahora</h1>
              <p className="mt-1 text-sm sm:text-base text-indigo-100/90">Cuando actives un evento, aparecerá aquí.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
