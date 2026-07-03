'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { Utensils, X, Check, Loader2 } from 'lucide-react';

interface DietaryPerson {
  id: string;
  type: 'Participante' | 'Invitado';
  name: string;
  documentNumber?: string | null;
  dietary: string;
  belongsTo?: string | null;
  isAccredited: boolean;
}

interface DietaryModalProps {
  scheduleId: string;
  onClose: () => void;
}

const DietaryModal: React.FC<DietaryModalProps> = ({ scheduleId, onClose }) => {
  const [list, setList] = useState<DietaryPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get<DietaryPerson[]>(`/api/accreditation/dietary?scheduleId=${scheduleId}`)
      .then((res) => { if (active) setList(Array.isArray(res) ? res : []); })
      .catch(() => { if (active) setList([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scheduleId]);

  const accreditedCount = list.filter((p) => p.isAccredited).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">Requerimientos alimentarios</h2>
            <span className="text-sm text-gray-500">({list.length})</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 rounded-md p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : list.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Nadie registró requerimientos alimentarios en este evento.</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">{accreditedCount} de {list.length} ya acreditados.</p>
              <ul className="space-y-2">
                {list.map((p) => (
                  <li key={`${p.type}-${p.id}`} className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {p.name}
                        <span className="ml-2 text-[11px] font-normal text-gray-400 uppercase tracking-wide">{p.type}</span>
                      </p>
                      {p.belongsTo && <p className="text-xs text-gray-500">Invitado de {p.belongsTo}</p>}
                      {p.documentNumber && <p className="text-xs text-gray-500">{p.documentNumber}</p>}
                      <p className="text-sm text-orange-700 mt-0.5 flex items-center gap-1"><Utensils size={12} /> {p.dietary}</p>
                    </div>
                    {p.isAccredited ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700 whitespace-nowrap"><Check size={14} /> Acreditado</span>
                    ) : (
                      <span className="text-xs text-gray-400 whitespace-nowrap">Sin acreditar</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietaryModal;
