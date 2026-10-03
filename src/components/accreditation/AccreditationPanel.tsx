'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEventStore from '@/store/eventStore';
import apiClient from '@/utils/apiClient';
import SearchParticipant from './SearchParticipant';
import ParticipantCard from './ParticipantCard';
import AwardedModal from './AwardedModal';
import DietaryModal from './DietaryModal';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import { getAccreditationFields } from '@/utils/formFields';
import { formatDateCL, formatTimeCL } from '@/utils/formatters';
import { Clock, MapPin, Users, UserCheck, UsersRound, Award, DoorOpen, DoorClosed, Calendar, Utensils, RefreshCw, X } from 'lucide-react';

interface AccreditationPanelProps {
  eventId?: string;
  scheduleId?: string;
}

interface Stats { participants: number; guests: number; total: number; awarded: number; awardedTotal?: number }
interface ScheduleStat { scheduleId: string; label: string; startDateTime: string; location?: string; participants: number; guests: number; total: number }
interface EventStats { perSchedule: ScheduleStat[]; totals: { participants: number; guests: number; total: number } }

const STATUS: Record<string, { label: string; cls: string }> = {
  accrediting: { label: 'En acreditación', cls: 'bg-green-100 text-green-700' },
  published: { label: 'Programado', cls: 'bg-blue-100 text-blue-700' },
  accredited: { label: 'Cerrado', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};
const fmtTime = (d: string) => formatTimeCL(d, { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d: string) => formatDateCL(d, { weekday: 'short', day: '2-digit', month: 'short' });

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; color: string; onClick?: () => void }> = ({ icon: Icon, label, value, color, onClick }) => {
  const cls = `bg-white border border-gray-200 rounded-xl p-3 text-center ${onClick ? 'cursor-pointer hover:border-amber-300 hover:shadow-sm transition' : ''}`;
  const content = (
    <>
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 flex items-center justify-center gap-0.5">{label}</p>
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} w-full`}>{content}</button>
    : <div className={cls}>{content}</div>;
};

const AccreditationPanel = ({ eventId: eventIdProp, scheduleId: scheduleIdProp }: AccreditationPanelProps) => {
  const { EventSchedules, fetchSchedulesForEvent, setScheduleStatus } = useEventStore();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState(eventIdProp || '');
  const [scheduleId, setScheduleId] = useState(scheduleIdProp || '');
  const [selectedPerson, setSelectedPerson] = useState<{ type: 'participant' | 'guest'; data: Participant | Guest } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [showAwarded, setShowAwarded] = useState(false);
  const [showDietary, setShowDietary] = useState(false);
  // Modal de trabajo: al elegir una fecha se abre aquí el buscador + la ficha, en vez de
  // aparecer al final de la página (evita el scroll largo). Se queda abierto para seguir
  // acreditando y se refresca con el botón "Actualizar" y tras cada acreditación.
  const [workOpen, setWorkOpen] = useState(false);
  // Se incrementa al tocar "Actualizar": se pasa a la ficha (refreshKey) para que recargue
  // su estado de acreditación (badge), no solo los contadores del panel.
  const [cardRefreshTick, setCardRefreshTick] = useState(0);
  const personCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.get<any>('/api/events?page=1&limit=100')
      .then((res) => setEvents(res.events || res.data || (Array.isArray(res) ? res : [])))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (eventId) fetchSchedulesForEvent(eventId);
    setScheduleId('');
    setSelectedPerson(null);
    setStats(null);
    setWorkOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // La ficha de la persona aparece bajo el buscador (dentro del modal); en celular queda
  // fuera de vista al seleccionarla, así que se desplaza hasta ella.
  useEffect(() => {
    if (selectedPerson && personCardRef.current && window.matchMedia('(max-width: 639px)').matches) {
      personCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedPerson]);

  const loadStats = useCallback(() => {
    if (!scheduleId) { setStats(null); return; }
    apiClient.get<Stats>(`/api/accreditation/stats?scheduleId=${scheduleId}`).then(setStats).catch(() => setStats(null));
  }, [scheduleId]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const loadEventStats = useCallback(() => {
    if (!eventId) { setEventStats(null); return; }
    apiClient.get<EventStats>(`/api/accreditation/event-stats?eventId=${eventId}`).then(setEventStats).catch(() => setEventStats(null));
  }, [eventId]);
  useEffect(() => { loadEventStats(); }, [loadEventStats]);

  // Refresca contadores por fecha, del evento y el estado de los horarios. Se usa tras
  // cada acreditación (ParticipantCard) y desde el botón "Actualizar" del modal.
  const refresh = useCallback(() => {
    loadStats();
    loadEventStats();
    if (eventId) fetchSchedulesForEvent(eventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStats, loadEventStats, eventId]);

  // "Actualizar" del modal: refresca los contadores del panel Y le pide a la ficha abierta
  // que recargue su estado (badge Acreditado/No), por si cambió desde otro lado.
  const handleManualRefresh = () => {
    refresh();
    setCardRefreshTick((t) => t + 1);
  };

  const openWork = (sId: string) => {
    setScheduleId(sId);
    setSelectedPerson(null);
    setWorkOpen(true);
  };

  const toggleStatus = async (s: any, status: string) => {
    try { await setScheduleStatus(s.id, eventId, status); } catch { /* el store guarda el error */ }
  };

  const schedules = EventSchedules as any[];
  const selectedSchedule = schedules.find((s: any) => s.id === scheduleId);
  const selectedScheduleLabel = selectedSchedule?.label || selectedSchedule?.scheduleName;
  // Campos extra que este evento eligió mostrar en la acreditación (además de los fijos).
  const currentEvent = events.find((e) => e.id === eventId);
  const accreditationFields = getAccreditationFields((currentEvent as any)?.registrationConfig);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Acreditación</h1>

      {/* Paso 1: Evento */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">1. Evento</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          disabled={!!eventIdProp}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-gray-100"
        >
          <option value="">— Selecciona un evento —</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Paso 2: Fecha del evento */}
      {eventId && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">2. Fecha del evento</label>
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-400 border border-dashed rounded-lg p-4">Este evento no tiene fechas configuradas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schedules.map((s) => {
                const sel = s.id === scheduleId;
                const st = STATUS[s.status] || STATUS.published;
                // En el panel se muestran solo CANTIDADES (sin barras ni topes): el cupo es
                // límite de inscripción y el aforo se controla al acreditar, no se topa aquí.
                // Hasta que llegan las stats reales (event-stats) se muestra "—" en vez de
                // un aproximado.
                const est = eventStats?.perSchedule.find((ps) => ps.scheduleId === s.id);
                const partN: number | string = est ? est.participants : '—';
                const guestN: number | string = est ? est.guests : '—';
                const bodies: number | string = est ? est.total : '—';
                return (
                  <div key={s.id} className={`rounded-lg border p-3 transition ${sel ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800">{s.label || s.scheduleName}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                      <p className="flex items-center gap-1"><Calendar size={12} /> <span className="capitalize">{fmtDate(s.startDateTime)}</span></p>
                      <p className="flex items-center gap-1"><Clock size={12} /> {fmtTime(s.startDateTime)} – {fmtTime(s.endDateTime)}</p>
                      {(s.location || s.displayLocation) && <p className="flex items-center gap-1"><MapPin size={12} /> {s.location || s.displayLocation}</p>}
                    </div>
                    <div className="mt-2 flex items-stretch gap-1.5 text-center">
                      <div className="flex-1 rounded-lg bg-gray-50 py-1.5">
                        <p className="text-lg font-semibold text-indigo-600 leading-none">{partN}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Participantes</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-gray-50 py-1.5">
                        <p className="text-lg font-semibold text-teal-600 leading-none">{guestN}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Invitados</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-indigo-50 py-1.5">
                        <p className="text-lg font-semibold text-gray-900 leading-none">{bodies}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Aforo</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => openWork(s.id)} className={`flex-1 text-sm font-medium rounded-md py-2 ${sel ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:bg-indigo-300'}`}>
                        {sel ? 'Continuar acreditando' : 'Acreditar aquí'}
                      </button>
                      {s.status === 'published' && <button onClick={() => toggleStatus(s, 'accrediting')} title="Abrir acreditación" className="text-green-600 hover:bg-green-50 rounded-md p-2 border border-green-200"><DoorOpen size={18} /></button>}
                      {s.status === 'accrediting' && <button onClick={() => toggleStatus(s, 'accredited')} title="Cerrar acreditación" className="text-gray-500 hover:bg-gray-100 rounded-md p-2 border border-gray-200"><DoorClosed size={18} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resumen de asistencia por fecha (participantes / invitados / total) */}
      {eventId && eventStats && eventStats.perSchedule.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Asistencia por fecha</label>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {eventStats.perSchedule.map((s) => (
                <div key={s.scheduleId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{s.label}</p>
                    <p className="text-xs text-gray-500 capitalize">{fmtDate(s.startDateTime)}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
                    <div className="text-center min-w-[64px]"><p className="font-bold text-indigo-600">{s.participants}</p><p className="text-[11px] text-gray-500">Participantes</p></div>
                    <div className="text-center min-w-[56px]"><p className="font-bold text-teal-600">{s.guests}</p><p className="text-[11px] text-gray-500">Invitados</p></div>
                    <div className="text-center min-w-[44px]"><p className="font-bold text-gray-900">{s.total}</p><p className="text-[11px] text-gray-500">Total</p></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 border-t border-gray-200">
              <p className="font-semibold text-gray-800">Totales</p>
              <div className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
                <div className="text-center min-w-[64px]"><p className="font-bold text-indigo-600">{eventStats.totals.participants}</p><p className="text-[11px] text-gray-500">Participantes</p></div>
                <div className="text-center min-w-[56px]"><p className="font-bold text-teal-600">{eventStats.totals.guests}</p><p className="text-[11px] text-gray-500">Invitados</p></div>
                <div className="text-center min-w-[44px]"><p className="font-bold text-gray-900">{eventStats.totals.total}</p><p className="text-[11px] text-gray-500">Total</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de trabajo: Paso 3 (buscar + ficha + contadores). z-40 para quedar DEBAJO
          de los modales de Premiados/Dietario (z-50), que se abren desde aquí.
          Responsive: en celular es una hoja inferior a ancho completo (rounded-t), en
          desktop un diálogo centrado (max-w-2xl). SIN overflow-hidden en la tarjeta: así
          el desplegable del buscador (absolute) NO se recorta; las esquinas se redondean
          en el encabezado (arriba) y en el cuerpo (abajo). El buscador va FUERA del área
          con scroll, por el mismo motivo. */}
      {workOpen && scheduleId && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setWorkOpen(false)}>
          <div className="bg-gray-50 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Encabezado: fecha + Actualizar + cerrar */}
            <div className="shrink-0 bg-white rounded-t-2xl border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Acreditando</p>
                <p className="font-semibold text-gray-900 truncate">
                  {selectedScheduleLabel}
                  {selectedSchedule?.startDateTime && (
                    <span className="capitalize font-normal text-gray-500"> · {fmtDate(selectedSchedule.startDateTime)} {fmtTime(selectedSchedule.startDateTime)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  title="Actualizar contadores"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 sm:px-3 py-2 hover:bg-indigo-100 active:bg-indigo-200 whitespace-nowrap"
                >
                  <RefreshCw size={16} /> Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => setWorkOpen(false)}
                  title="Cerrar"
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Buscador: FUERA del área con scroll para que su desplegable no se recorte. */}
            <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar participante</label>
              <SearchParticipant eventId={eventId} onSelect={setSelectedPerson} scheduleId={scheduleId} />
            </div>

            {/* Cuerpo con scroll: ficha de la persona + contadores + dietario. */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 sm:rounded-b-2xl">
              {selectedPerson && (
                <div ref={personCardRef} className="scroll-mt-4">
                  <ParticipantCard person={selectedPerson.data} type={selectedPerson.type} scheduleId={scheduleId} scheduleLabel={selectedScheduleLabel} accreditationFields={accreditationFields} onAccredited={refresh} refreshKey={cardRefreshTick} />
                </div>
              )}

              <div className={`grid grid-cols-2 gap-3 ${(stats?.awardedTotal ?? 0) > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                <StatCard icon={UserCheck} label="Participantes" value={stats?.participants ?? '—'} color="text-indigo-600" />
                <StatCard icon={Users} label="Invitados" value={stats?.guests ?? '—'} color="text-teal-600" />
                <StatCard icon={UsersRound} label="Total" value={stats?.total ?? '—'} color="text-gray-900" />
                {(stats?.awardedTotal ?? 0) > 0 && <StatCard icon={Award} label="Premiados" value={stats?.awarded ?? 0} color="text-amber-600" onClick={() => setShowAwarded(true)} />}
              </div>

              <button
                type="button"
                onClick={() => setShowDietary(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg py-2.5 hover:bg-orange-100 transition"
              >
                <Utensils size={16} /> Ver requerimientos alimentarios
              </button>
            </div>
          </div>
        </div>
      )}

      {showAwarded && scheduleId && (
        <AwardedModal scheduleId={scheduleId} onClose={() => setShowAwarded(false)} />
      )}

      {showDietary && scheduleId && (
        <DietaryModal scheduleId={scheduleId} onClose={() => setShowDietary(false)} />
      )}
    </div>
  );
};

export default AccreditationPanel;
