'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { formatDateTimeCL } from '@/utils/formatters';

export interface AttendanceHistoryEntry {
  id: string;
  scheduleId: string;
  scheduleName: string;
  startDateTime: string;
  checkInTime: string;
}

export function AttendanceHistoryNotice({ history }: { history: AttendanceHistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <div role="status" className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-3">
      <CalendarClock size={20} className="text-amber-700 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900 min-w-0">
        <p className="font-semibold">Ya asistió a {history.length === 1 ? 'otra fecha' : `${history.length} fechas`}</p>
        <ul className="mt-2 space-y-2">
          {history.map((entry) => (
            <li key={entry.id}>
              <span className="font-medium">{entry.scheduleName}</span>
              {entry.startDateTime && <span> · {formatDateTimeCL(entry.startDateTime)}</span>}
              <span className="block text-xs mt-0.5">Ingreso registrado: {formatDateTimeCL(entry.checkInTime)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">Aviso informativo. Puedes acreditar su asistencia en esta fecha.</p>
      </div>
    </div>
  );
}

export default function AttendanceHistoryAlert({ type, personId, scheduleId, refreshKey, accredited }: {
  type: 'participant' | 'guest'; personId: string; scheduleId: string; refreshKey?: number; accredited: boolean;
}) {
  const [history, setHistory] = useState<AttendanceHistoryEntry[]>([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setHistory([]);
    setError('');
    const params = new URLSearchParams({ type, id: personId, scheduleId });
    apiClient.get<{ history: AttendanceHistoryEntry[] }>(`/api/accreditations/history?${params}`)
      .then((response) => { if (!cancelled) setHistory(response.history); })
      .catch(() => { if (!cancelled) setError('No se pudo comprobar si ya asistió a otras fechas. Puedes continuar acreditando.'); });
    return () => { cancelled = true; };
  }, [type, personId, scheduleId, refreshKey, accredited, retry]);

  if (error) return (
    <div role="status" className="mx-4 sm:mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline font-medium">Reintentar historial</button>
    </div>
  );
  return <AttendanceHistoryNotice history={history} />;
}
