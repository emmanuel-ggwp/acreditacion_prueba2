'use client';

import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '@/utils/apiClient';
import useEventStore from '@/store/eventStore';
import { formatDateTimeCL, formatEventDate } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UserCheck, UserX, Award, RotateCcw, History } from 'lucide-react';

interface HistoryItem {
  id: string;
  action: 'ACCREDITED' | 'UNACCREDITED';
  at: string;
  personName: string;
  personType: 'participant' | 'guest';
  participantId: string | null;
  guestId: string | null;
  scheduleId: string | null;
  scheduleText: string;
  guests: number;
  isAwarded: boolean;
  by: string | null;
  byEmail: string | null;
}

interface Props {
  eventId: string;
}

/**
 * Historial de acreditación del evento: quién acreditó o des-acreditó a quién, a qué hora,
 * en qué fecha y si es premiado. Datos desde el log de auditoría (incluye des-acreditaciones,
 * que ya no existen como fila de acreditación). Filtrable por fecha del evento.
 */
const EventAccreditationHistory: React.FC<Props> = ({ eventId }) => {
  const { EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleId, setScheduleId] = useState('');

  useEffect(() => {
    if (eventId) fetchSchedulesForEvent(eventId);
  }, [eventId, fetchSchedulesForEvent]);

  const load = useCallback(() => {
    setLoading(true);
    const qs = scheduleId ? `?scheduleId=${encodeURIComponent(scheduleId)}` : '';
    apiClient.get<HistoryItem[]>(`/api/events/${eventId}/accreditation-history${qs}`)
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [eventId, scheduleId]);

  useEffect(() => { load(); }, [load]);

  const accredited = items.filter((i) => i.action === 'ACCREDITED').length;
  const unaccredited = items.filter((i) => i.action === 'UNACCREDITED').length;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <History size={20} className="text-indigo-500 flex-shrink-0" /> Historial de acreditación
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Quién acreditó o des-acreditó a quién, la hora y si es premiado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white max-w-[70vw]"
          >
            <option value="">Todas las fechas</option>
            {EventSchedules.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.scheduleName || s.label || formatEventDate(s.startDateTime, s.endDateTime)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Actualizar"
          >
            <RotateCcw size={15} /> Actualizar
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 px-2.5 py-1 font-medium">
          <UserCheck size={14} /> {accredited} acreditación(es)
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-600 px-2.5 py-1 font-medium">
          <UserX size={14} /> {unaccredited} des-acreditación(es)
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Aún no hay actividad de acreditación registrada para este evento.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const isAcc = it.action === 'ACCREDITED';
            return (
              <li
                key={it.id}
                className={`rounded-xl border p-3 sm:p-4 ${isAcc ? 'border-green-100 bg-green-50/40' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isAcc ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {isAcc ? <UserCheck size={13} /> : <UserX size={13} />}
                    {isAcc ? 'Acreditó' : 'Des-acreditó'}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">{formatDateTimeCL(it.at)}</span>
                </div>

                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 break-words">{it.personName}</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {it.personType === 'guest' ? 'Invitado' : 'Titular'}
                  </span>
                  {it.isAwarded && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      <Award size={12} /> Premiado
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm text-gray-600">
                  {it.scheduleText || 'Fecha del evento'}
                  {it.guests > 0 && <span className="text-gray-500"> · {it.guests} invitado(s)/carga(s)</span>}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Por: <span className="font-medium text-gray-700">{it.by || '—'}</span>
                  {it.byEmail && <span className="text-gray-400"> · {it.byEmail}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EventAccreditationHistory;
