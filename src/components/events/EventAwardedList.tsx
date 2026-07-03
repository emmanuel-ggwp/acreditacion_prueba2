'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { Award, Check, Loader2 } from 'lucide-react';

interface AwardedParticipant {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber?: string | null;
  awardReason?: string | null;
  isAwarded?: boolean;
  accreditedAt?: string | null;
}

const fmtCheckIn = (d?: string | null) => {
  if (!d) return null;
  try { return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return null; }
};

const EventAwardedList: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [list, setList] = useState<AwardedParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get<any>(`/api/events/${eventId}/participants?page=1&limit=1000`)
      .then((res) => {
        if (!active) return;
        const all = res.participants || (Array.isArray(res) ? res : []);
        setList(all.filter((p: any) => p.isAwarded));
      })
      .catch(() => { if (active) setError('No se pudieron cargar los premiados.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <Award className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900">Premiados del evento</h2>
        {!loading && <span className="text-sm text-gray-500">({list.length})</span>}
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Personas marcadas como premiadas. Puedes marcar o quitar premiados desde la pestaña <b>Participantes</b> (botón de premio 🏆).
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
        </div>
      ) : error ? (
        <p className="text-red-500 py-6 text-center text-sm">{error}</p>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Award className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">Aún no hay premiados en este evento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT / Documento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acreditado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((p) => {
                const hora = fmtCheckIn(p.accreditedAt);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{p.documentNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.awardReason || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {hora ? (
                        <span className="inline-flex items-center gap-1 text-green-700"><Check size={14} /> {hora}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin acreditar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EventAwardedList;
