'use client';

import React, { useEffect, useState } from 'react';
import { Users, Calendar, CheckSquare, TrendingUp, ChevronLeft, ChevronRight, Copy, Globe, Lock, Ban, ExternalLink } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import useEventStore from '@/store/eventStore';
import { ButtonEventReport } from '../events/ButtonEventReport';
import { showToast } from '@/components/ui/Toast';
import DashboardHero from './DashboardHero';
import { formatDateTimeCL } from '@/utils/formatters';

interface ScheduleStat {
  id: string;
  scheduleName: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  registered: number;
  registeredTotal: number;
  registeredParticipants: number;
  registeredGuests: number;
  accreditedTotal: number;
  accreditedParticipants: number;
  accreditedGuests: number;
  awardsDelivered: number;
  capacityUsedPercentage: number;
}

interface EventStat {
  id: string;
  name: string;
  date: string;
  registered: number;
  attendees: number;
  awards: number;
  schedules: ScheduleStat[];
  participants: number;
  guests: number;
  isActive: boolean;
  isPublic: boolean;
  registrationOpen: boolean;
  publicSlug: string | null;
}

// Barra apilada Participantes vs Invitados (reemplaza la dona, más legible).
const ParticipantGuestChart = React.memo(({ participants, guests }: { participants: number, guests: number }) => {
  const total = participants + guests;
  if (total === 0) {
    return <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">Sin datos aún</p>;
  }
  const pPct = (participants / total) * 100;
  return (
    <div className="mt-2 pt-2 border-t border-gray-50">
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100">
        {participants > 0 && <div style={{ width: `${pPct}%` }} className="bg-indigo-500" />}
        {guests > 0 && <div style={{ width: `${100 - pPct}%` }} className="bg-emerald-500" />}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        {/* flex-wrap: en columnas angostas (vista por fecha en escritorio) el número
            baja de línea en vez de truncar la etiqueta ("Parti…"). */}
        <div className="flex items-center justify-between gap-x-2 gap-y-0.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" /> Participantes</span>
          <b className="text-gray-900 tabular-nums">{participants}</b>
        </div>
        <div className="flex items-center justify-between gap-x-2 gap-y-0.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" /> Invitados</span>
          <b className="text-gray-900 tabular-nums">{guests}</b>
        </div>
      </div>
    </div>
  );
});
ParticipantGuestChart.displayName = 'ParticipantGuestChart';

const EventStatCard = React.memo(({ stat, viewMode }: { stat: EventStat, viewMode: 'event' | 'date' }) => {
  const badge = !stat.isActive
    ? { t: 'Cancelado', c: 'bg-red-100 text-red-700', I: Ban }
    : !stat.isPublic
      ? { t: 'Borrador', c: 'bg-gray-100 text-gray-600', I: Lock }
      : stat.registrationOpen
        ? { t: 'Inscripción abierta', c: 'bg-green-100 text-green-700', I: Globe }
        : { t: 'Inscripción cerrada', c: 'bg-amber-100 text-amber-700', I: Lock };
  const hasLanding = stat.isPublic && !!stat.publicSlug;
  const landingUrl = hasLanding && typeof window !== 'undefined' ? `${window.location.origin}/public/events/${stat.publicSlug}` : '';
  const copyLink = () => {
    if (!landingUrl) return;
    navigator.clipboard.writeText(landingUrl).then(() => showToast.success('Enlace copiado')).catch(() => showToast.error('No se pudo copiar'));
  };

  return (
  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex justify-between items-start mb-3 gap-2">
      <h4 className="text-base font-bold text-gray-900 flex-1 min-w-0 line-clamp-2 break-words" title={stat.name}>{stat.name}</h4>
      <ButtonEventReport eventId={stat.id} eventName={stat.name} size={'large'} />
    </div>

    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.c}`}>
        <badge.I size={12} /> {badge.t}
      </span>
      {hasLanding && (
        <>
          <button onClick={copyLink} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
            <Copy size={12} /> Copiar enlace
          </button>
          <a href={landingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100">
            <ExternalLink size={12} /> Ver
          </a>
        </>
      )}
    </div>

    {viewMode === 'event' ? (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Inscritos: <span className="font-medium text-gray-900">{stat.registered}</span></p>
        <p className="text-sm text-gray-600">
          Asistentes: <span className="font-medium text-gray-900">{stat.attendees}</span> 
          <span className="text-gray-500 ml-1">(Premiados: {stat.awards})</span>
        </p>
        <ParticipantGuestChart participants={stat.participants} guests={stat.guests} />
      </div>
    ) : (
      <div className="space-y-4">
        {stat.schedules.map((schedule) => (
          <div key={schedule.id} className="border-b border-gray-100 pb-6 mb-6 last:border-0 last:mb-0 last:pb-0">
            <div className="mb-4">
                <p className="text-base font-semibold text-gray-900">{schedule.scheduleName}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                    {formatDateTimeCL(schedule.startDateTime, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">Inscritos</p>
                <p className="text-xl font-bold text-gray-900">{schedule.registered}</p>
                <ParticipantGuestChart participants={schedule.registeredParticipants} guests={schedule.registeredGuests} />
              </div>
              <div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Asistentes</p>
                        <p className="text-xl font-bold text-gray-900">{schedule.accreditedTotal}</p>
                    </div>
                    {schedule.awardsDelivered > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400 mb-0.5">Premiados</p>
                            <p className="text-sm font-medium text-gray-700">{schedule.awardsDelivered}</p>
                        </div>
                    )}
                </div>
                <ParticipantGuestChart participants={schedule.accreditedParticipants} guests={schedule.accreditedGuests} />
              </div>
            </div>
          </div>
        ))}
        {stat.schedules.length === 0 && <p className="text-sm text-gray-500 italic">No se encontraron horarios.</p>}
      </div>
    )}
  </div>
  );
});
EventStatCard.displayName = 'EventStatCard';

const StatCard = React.memo(({ title, value, icon: Icon, trend, trendUp }: { title: string; value: number | string; icon: React.ElementType, trend?: string, trendUp?: boolean }) => (
  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group h-full">
    <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        {trend && (
            <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'}`}>
                <TrendingUp size={14} className={`mr-1 ${trendUp ? '' : 'text-gray-400'}`} />
                {trend}
            </span>
        )}
    </div>
    <div>
      <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
    </div>
  </div>
));

const DashboardStats: React.FC = () => {
  const { events, fetchEvents, total, loading: eventsLoading } = useEventStore();
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [viewMode, setViewMode] = useState<'event' | 'date'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [kpis, setKpis] = useState<{ totalEvents?: number; activeEvents?: number; totalParticipants?: number; accreditationsToday?: number } | null>(null);
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  useEffect(() => {
    apiClient.get<any>('/api/reports/dashboard').then((d) => setKpis(d)).catch(() => {});
  }, []);

  // Si el total baja (p. ej. se borran eventos) y quedamos en una página que ya no
  // existe, volver a la última válida para no mostrar una página vacía.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    fetchEvents({ page: currentPage, limit: itemsPerPage });
  }, [fetchEvents, currentPage]);

  useEffect(() => {
    const fetchStats = async () => {
      if (eventsLoading) return;

      setLoadingStats(true);
      
      if (events.length === 0) {
          setEventStats([]);
          setLoadingStats(false);
          return;
      }
      
      try {
        // Call batch reports endpoint with all event IDs in a single request
        const idsParam = events.map(event => event.id).join(',');
        const reports = await apiClient.get<any[]>(`/api/reports/events?ids=${idsParam}`);

        // Map reports by eventId for quick lookup
        const reportMap = new Map<string, any>(
          reports.map((report: any) => [report.eventInfo.id, report])
        );

        const results = events.map((event) => {
          try {
            const report = reportMap.get(event.id);
            if (!report) return null;

            const schedules = report.scheduleStats || [];
            let date = 'N/A';
            let scheduleStats: ScheduleStat[] = [];

            if (schedules.length > 0) {
                const dates = schedules.map((s: any) => new Date(s.startDateTime).getTime());
                const minDate = new Date(Math.min(...dates));
                date = formatDateTimeCL(minDate, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                scheduleStats = schedules.map((s: any, index: number) => ({
                  id: `${event.id}-${index}`,
                  scheduleName: s.scheduleName,
                  startDateTime: s.startDateTime,
                  endDateTime: s.endDateTime,
                  capacity: s.capacity,
                  registered: s.registered,
                  registeredTotal: s.registeredTotal,
                  registeredParticipants: s.registeredParticipants,
                  registeredGuests: s.registeredGuests,
                  accreditedTotal: s.accreditedTotal,
                  accreditedParticipants: s.accreditedParticipants,
                  accreditedGuests: s.accreditedGuests,
                  awardsDelivered: s.awardsDelivered,
                  capacityUsedPercentage: s.capacityUsedPercentage
                }));
            }
            return {
              id: event.id,
              name: event.name,
              date: date,
              // Personas totales (participantes + invitados) para cuadrar con "asistentes"
              // (que también son personas) y con la vista por fecha (registeredTotal).
              registered: report.participantStats.totalRegistered,
              attendees: report.participantStats.totalAccredited,
              awards: report.awardStats.delivered,
              schedules: scheduleStats,
              participants: report.participantStats.accredited || 0,
              guests: report.participantStats.accreditedGuests || 0,
              isActive: (event as any).isActive !== false,
              isPublic: !!(event as any).isPublic,
              registrationOpen: (event as any).registrationOpen !== false,
              publicSlug: (event as any).publicSlug ?? null,
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        });

        setEventStats(results.filter(r => r !== null) as EventStat[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [events, eventsLoading]);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Cabecera: eventos activos arriba (null mientras carga el KPI). */}
      <DashboardHero activeEvents={kpis === null ? null : (kpis.activeEvents ?? 0)} />

      {/* KPIs reales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="Eventos" value={kpis?.totalEvents ?? '—'} icon={Calendar} />
        <StatCard title="Participantes" value={kpis?.totalParticipants ?? '—'} icon={Users} />
        {/* En móvil ocupa el ancho completo (fila propia): evita la tarjeta suelta a media fila. */}
        <div className="col-span-2 sm:col-span-1">
          <StatCard title="Personas acreditadas hoy" value={kpis?.accreditationsToday ?? '—'} icon={CheckSquare} />
        </div>
      </div>

      {/* Event Statistics Section */}
      <div className="space-y-4">
        {/* Toggle segmentado (reemplaza el dropdown): más táctil, siempre visible el
            modo activo y sin el bug de "no cierra al hacer clic fuera". */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-500">Ver estadísticas:</span>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm" role="tablist" aria-label="Agrupar estadísticas">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'date'}
              onClick={() => setViewMode('date')}
              className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${viewMode === 'date' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Por Fecha
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'event'}
              onClick={() => setViewMode('event')}
              className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${viewMode === 'event' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Por Evento
            </button>
          </div>
        </div>

        {loadingStats || eventsLoading ? (
            <div className="text-center py-10">Cargando estadísticas...</div>
        ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {eventStats.map(stat => (
                      <EventStatCard key={stat.id} stat={stat} viewMode={viewMode} />
                  ))}
                  {eventStats.length === 0 && <div className="text-gray-500">No se encontraron eventos.</div>}
              </div>
              
              {total > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
                  <div className="flex flex-1 items-center justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">Página <span className="font-medium text-gray-900">{currentPage}</span> de <span className="font-medium text-gray-900">{totalPages}</span></span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, total)}</span> de <span className="font-medium">{total}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Anterior</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Siguiente</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
