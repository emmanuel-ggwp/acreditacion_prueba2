'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { Award, X, Check, Clock, Loader2 } from 'lucide-react';

interface AwardedPerson {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber?: string | null;
  awardReason?: string | null;
  isAccredited: boolean;
  checkInTime?: string | null;
}

interface AwardedModalProps {
  scheduleId: string;
  onClose: () => void;
}

const fmtTime = (d?: string | null) => {
  if (!d) return '';
  try { return new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

const AwardedModal: React.FC<AwardedModalProps> = ({ scheduleId, onClose }) => {
  const [list, setList] = useState<AwardedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get<AwardedPerson[]>(`/api/accreditation/awarded?scheduleId=${scheduleId}`)
      .then((res) => { if (active) setList(Array.isArray(res) ? res : []); })
      .catch(() => { if (active) setList([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scheduleId]);

  const accredited = list.filter((p) => p.isAccredited);
  const pending = list.filter((p) => !p.isAccredited);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold">Premiados</h2>
            <span className="text-sm text-gray-500">
              ({accredited.length}/{list.length} acreditados)
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 rounded-md p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : list.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No hay premiados en este evento.</p>
          ) : (
            <>
              {accredited.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">
                    Ya acreditados ({accredited.length})
                  </p>
                  <ul className="space-y-2">
                    {accredited.map((p) => (
                      <li key={p.id} className="flex items-start justify-between gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.firstName} {p.lastName}</p>
                          {p.documentNumber && <p className="text-xs text-gray-500">{p.documentNumber}</p>}
                          {p.awardReason && <p className="text-xs text-amber-700 italic mt-0.5 truncate">"{p.awardReason}"</p>}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 whitespace-nowrap">
                          <Check size={14} />
                          {fmtTime(p.checkInTime) && <span className="flex items-center gap-0.5"><Clock size={12} /> {fmtTime(p.checkInTime)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Pendientes ({pending.length})
                  </p>
                  <ul className="space-y-2">
                    {pending.map((p) => (
                      <li key={p.id} className="flex items-start justify-between gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-700 truncate">{p.firstName} {p.lastName}</p>
                          {p.documentNumber && <p className="text-xs text-gray-500">{p.documentNumber}</p>}
                          {p.awardReason && <p className="text-xs text-amber-700 italic mt-0.5 truncate">"{p.awardReason}"</p>}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">Sin acreditar</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AwardedModal;
