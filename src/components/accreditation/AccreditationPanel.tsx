'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEventStore from '@/store/eventStore';
import apiClient from '@/utils/apiClient';
import SearchParticipant from './SearchParticipant';
import ParticipantCard from './ParticipantCard';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import { Clock, MapPin, Users, UserCheck, UsersRound, Award, DoorOpen, DoorClosed, Calendar } from 'lucide-react';

interface AccreditationPanelProps {
  eventId?: string;
  scheduleId?: string;
}

interface Stats { participants: number; guests: number; total: number; awarded: number }

const STATUS: Record<string, { label: string; cls: string }> = {
  accrediting: { label: 'En acreditación', cls: 'bg-green-100 text-green-700' },
  published: { label: 'Programado', cls: 'bg-blue-100 text-blue-700' },
  accredited: { label: 'Cerrado', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};
const fmtTime = (d: string) => { try { return new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }); } catch { return ''; } };

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const AccreditationPanel = ({ eventId: eventIdProp, scheduleId: scheduleIdProp }: AccreditationPanelProps) => {
  const { EventSchedules, fetchSchedulesForEvent, setScheduleStatus } = useEventStore();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState(eventIdProp || '');
  const [scheduleId, setScheduleId] = useState(scheduleIdProp || '');
  const [selectedPerson, setSelectedPerson] = useState<{ type: 'participant' | 'guest'; data: Participant | Guest } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadStats = useCallback(() => {
    if (!scheduleId) { setStats(null); return; }
    apiClient.get<Stats>(`/api/accreditation/stats?scheduleId=${scheduleId}`).then(setStats).catch(() => setStats(null));
  }, [scheduleId]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const onAccredited = () => {
    loadStats();
    if (eventId) fetchSchedulesForEvent(eventId);
  };

  const toggleStatus = async (s: any, status: string) => {
    try { await setScheduleStatus(s.id, eventId, status); } catch { /* el store guarda el error */ }
  };

  const schedules = EventSchedules as any[];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Acreditación</h1>

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
                const cap = s.maxCapacity || s.displayMaxCapacity || s.Event?.maxCapacity || 0;
                const acc = Number(s.accreditedCount || 0);
                const pct = cap > 0 ? Math.min(100, Math.round((acc / cap) * 100)) : 0;
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
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5"><span>Acreditados</span><span className="font-medium">{acc}{cap > 0 ? ` / ${cap}` : ''}</span></div>
                      {cap > 0 && <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => { setScheduleId(s.id); setSelectedPerson(null); }} className={`flex-1 text-sm font-medium rounded-md py-1.5 ${sel ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                        {sel ? 'Seleccionada' : 'Trabajar aquí'}
                      </button>
                      {s.status === 'published' && <button onClick={() => toggleStatus(s, 'accrediting')} title="Abrir acreditación" className="text-green-600 hover:bg-green-50 rounded-md p-1.5 border border-green-200"><DoorOpen size={16} /></button>}
                      {s.status === 'accrediting' && <button onClick={() => toggleStatus(s, 'accredited')} title="Cerrar acreditación" className="text-gray-500 hover:bg-gray-100 rounded-md p-1.5 border border-gray-200"><DoorClosed size={16} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Paso 3: Stats + Buscar participante */}
      {scheduleId && (
        <div className="space-y-4">
          <div className={`grid grid-cols-2 gap-3 ${(stats?.awarded ?? 0) > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <StatCard icon={UserCheck} label="Acreditados" value={stats?.participants ?? '—'} color="text-indigo-600" />
            <StatCard icon={Users} label="Invitados" value={stats?.guests ?? '—'} color="text-teal-600" />
            <StatCard icon={UsersRound} label="Total" value={stats?.total ?? '—'} color="text-gray-900" />
            {(stats?.awarded ?? 0) > 0 && <StatCard icon={Award} label="Premiados" value={stats?.awarded ?? 0} color="text-amber-600" />}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Buscar participante</label>
            <SearchParticipant eventId={eventId} onSelect={setSelectedPerson} />
          </div>

          {selectedPerson && (
            <ParticipantCard person={selectedPerson.data} type={selectedPerson.type} scheduleId={scheduleId} onAccredited={onAccredited} />
          )}
        </div>
      )}
    </div>
  );
};

export default AccreditationPanel;
