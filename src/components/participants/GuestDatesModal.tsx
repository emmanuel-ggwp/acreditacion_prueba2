'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import useParticipantStore from '@/store/participantStore';
import { showToast } from '@/components/ui/Toast';
import { X, Loader2, CalendarClock, PlusCircle, Trash2 } from 'lucide-react';

interface Props {
  participantId: string;
  onClose: () => void;
  onSaved?: () => void;
}

type Row = {
  id?: string;
  firstName: string;
  lastName: string;
  age?: string;
  guestType?: string | null;
  scheduleIds: string[];
  isNew?: boolean;
};

const fmtDate = (s: any) => {
  try {
    return new Date(s.startDateTime).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  } catch { return ''; }
};

// Modal admin: asigna qué invitados de un participante asisten a cada fecha en la que el
// participante está inscrito (invitados distintos por fecha). Guarda los enlaces
// GuestSchedule; los enlaces ya acreditados se conservan (el servidor los preserva).
export default function GuestDatesModal({ participantId, onClose, onSaved }: Props) {
  const { setGuestDates } = useParticipantStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [dates, setDates] = useState<any[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p: any = await apiClient.get(`/api/participants/${participantId}`);
        if (!alive) return;
        setName(`${p.firstName} ${p.lastName || ''}`.trim());
        const ds = ((p.schedules as any[]) || []).slice()
          .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        setDates(ds);
        setRows(((p.guests as any[]) || []).map((g: any) => ({
          id: g.id,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          age: g.age != null ? String(g.age) : '',
          guestType: g.guestType || null,
          scheduleIds: ((g.schedules as any[]) || []).map((s: any) => s.id),
        })));
      } catch (e: any) {
        showToast.error(e?.message || 'No se pudo cargar el participante.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [participantId]);

  const toggle = (i: number, sid: string) => setRows((rs) => rs.map((r, idx) => (idx === i
    ? { ...r, scheduleIds: r.scheduleIds.includes(sid) ? r.scheduleIds.filter((x) => x !== sid) : [...r.scheduleIds, sid] }
    : r)));
  const addRow = () => setRows((rs) => [...rs, { firstName: '', lastName: '', age: '', scheduleIds: [], isNew: true }]);
  const updateRow = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows
        .filter((r) => r.id || r.firstName.trim())
        .map((r) => ({
          id: r.id,
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim() || undefined,
          age: r.age && String(r.age).trim() ? Number(r.age) : undefined,
          guestType: r.guestType || undefined,
          scheduleIds: r.scheduleIds,
        }));
      const res = await setGuestDates(participantId, payload);
      showToast.success(`Invitados por fecha guardados${res.created ? ` · ${res.created} nuevo(s)` : ''}.`);
      onSaved?.();
      onClose();
    } catch (e: any) {
      showToast.error(e?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarClock size={18} className="text-indigo-600" /> Invitados por fecha
            {name && <span className="text-sm font-normal text-gray-500">· {name}</span>}
          </h3>
          <button onClick={() => !saving && onClose()} className="text-gray-400 hover:text-gray-600" disabled={saving}><X size={20} /></button>
        </div>

        <div className="p-5 overflow-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-8 justify-center"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
          ) : dates.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4">
              Este participante no está inscrito en ninguna fecha todavía. Primero inscríbelo (botón <b>Inscribir</b> o <b>Inscribir a fechas</b>) y luego podrás asignar sus invitados por fecha.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">Marca a qué fecha asiste cada invitado. Puedes llevar personas distintas en cada fecha.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className="text-left font-semibold text-gray-600 px-2 py-2 sticky left-0 bg-white">Invitado</th>
                      {dates.map((d) => (
                        <th key={d.id} className="px-2 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">
                          <div>{d.label || d.scheduleName}</div>
                          <div className="text-[11px] font-normal text-gray-400 tabular-nums">{fmtDate(d)}</div>
                        </th>
                      ))}
                      <th className="px-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={dates.length + 2} className="px-2 py-4 text-gray-400 text-center">Sin invitados. Agrega uno abajo.</td></tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={r.id || `new-${i}`} className="border-t">
                        <td className="px-2 py-2 sticky left-0 bg-white">
                          {r.isNew ? (
                            <div className="flex flex-col gap-1 min-w-[10rem]">
                              <input value={r.firstName} onChange={(e) => updateRow(i, 'firstName', e.target.value)} placeholder="Nombre *" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                              <div className="flex gap-1">
                                <input value={r.lastName} onChange={(e) => updateRow(i, 'lastName', e.target.value)} placeholder="Apellido" className="px-2 py-1 border border-gray-300 rounded text-sm w-full min-w-0" />
                                <input value={r.age || ''} onChange={(e) => updateRow(i, 'age', e.target.value)} type="number" min={0} max={120} placeholder="Edad" className="px-2 py-1 border border-gray-300 rounded text-sm w-16" />
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-800">{`${r.firstName} ${r.lastName || ''}`.trim()}
                              {r.guestType && <span className="ml-1 text-xs text-gray-400">· {r.guestType === 'CARGA' ? 'Carga' : r.guestType === 'ACOMPANANTE' ? 'Acompañante' : r.guestType}</span>}
                            </span>
                          )}
                        </td>
                        {dates.map((d) => (
                          <td key={d.id} className="px-2 py-2 text-center">
                            <input type="checkbox" checked={r.scheduleIds.includes(d.id)} onChange={() => toggle(i, d.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          </td>
                        ))}
                        <td className="px-1 text-center">
                          <button type="button" onClick={() => removeRow(i)} title="Quitar de la lista" className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                <PlusCircle size={16} /> Agregar invitado
              </button>
              <p className="mt-3 text-xs text-gray-400">Los invitados ya acreditados en una fecha se conservan aunque los desmarques.</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={() => onClose()} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50">Cancelar</button>
          <button onClick={save} disabled={saving || loading || dates.length === 0} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
