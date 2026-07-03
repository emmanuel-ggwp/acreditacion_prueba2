'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Gauge } from 'lucide-react';
import apiClient from '@/utils/apiClient';

const RealtimeStats: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    apiClient.get<any>('/api/events?page=1&limit=100')
      .then((r) => setEvents(r.events || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId) { setData(null); return; }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const d = await apiClient.get<any>(`/api/reports/realtime/${eventId}`);
        if (active) { setData(d); setLastUpdated(new Date()); }
      } catch {
        /* silencioso */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 20000); // refresca cada 20s
    return () => { active = false; clearInterval(id); };
  }, [eventId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Panel en tiempo real</h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
              <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">Selecciona un evento…</option>
            {events.map((ev) => (<option key={ev.id} value={ev.id}>{ev.name}</option>))}
          </select>
        </div>
      </div>

      {!eventId ? (
        <div className="text-center py-12 text-gray-500">Elige un evento para ver sus estadísticas en vivo.</div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-500">Cargando datos en tiempo real…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-center">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-4xl font-bold text-green-600 flex items-center justify-center gap-2"><Activity size={28} /> {data.accreditationsLast30Min ?? 0}</p>
              <p className="text-gray-600 mt-1">Acreditados en los últimos 30 min</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-4xl font-bold text-indigo-600 flex items-center justify-center gap-2"><Gauge size={28} /> {(data.accreditationRatePerMinute ?? 0).toFixed(1)}</p>
              <p className="text-gray-600 mt-1">Acreditaciones por minuto</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Horarios activos ahora</h3>
            {(!data.currentCapacity || data.currentCapacity.length === 0) ? (
              <p className="text-gray-500 text-sm">No hay horarios activos en este momento.</p>
            ) : (
              <div className="space-y-3">
                {data.currentCapacity.map((c: any, i: number) => {
                  const unlimited = !c.capacity || c.available === null || c.available === undefined;
                  const pct = c.capacity > 0 ? Math.min(100, Math.round((c.accredited / c.capacity) * 100)) : 0;
                  return (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="font-medium truncate">{c.scheduleName}</span>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {c.accredited}{unlimited ? '' : ` / ${c.capacity}`} acreditados{unlimited ? ' (sin límite)' : ` · ${c.available} disp.`}
                        </span>
                      </div>
                      {!unlimited && (
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RealtimeStats;
