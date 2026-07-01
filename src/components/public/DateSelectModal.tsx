'use client';

import React from 'react';
import { X, Calendar, MapPin, Clock, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  schedules: any[];
  selectedIds: string[];
  multiple: boolean;
  onChange: (ids: string[]) => void;
  variant?: string;   // 'minimal' | 'modern' | 'default' (define claro/oscuro)
  accent?: string;    // color de acento (del tema del evento)
}

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' }); } catch { return ''; }
};
const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

/**
 * Modal para elegir la fecha del evento. Se adapta al diseño de la plantilla:
 * oscuro para "modern", claro para "minimal"/"default", con el color de acento del tema.
 */
export default function DateSelectModal({ open, onClose, schedules, selectedIds, multiple, onChange, variant = 'default', accent = '#4f46e5' }: Props) {
  if (!open) return null;
  const dark = variant === 'modern';

  const toggle = (id: string, full: boolean) => {
    if (full) return;
    if (multiple) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange([id]);
      onClose();
    }
  };

  const panelBg = dark ? '#0f172a' : '#ffffff';
  const textMain = dark ? 'text-white' : 'text-gray-900';
  const textMuted = dark ? 'text-slate-300' : 'text-gray-500';
  const cardBase = dark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50';
  const borderCls = dark ? 'border-white/10' : 'border-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: panelBg }}>
        <div className={`px-5 py-4 border-b ${borderCls}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${textMain}`}>Elige la fecha</h3>
            <button type="button" onClick={onClose} className={`${textMuted} hover:opacity-80`} aria-label="Cerrar"><X size={20} /></button>
          </div>
          <p className={`text-sm ${textMuted} mt-1`}>Selecciona la fecha a la que asistirás para continuar con tu inscripción.</p>
        </div>

        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {schedules.length === 0 && (
            <p className={`text-sm ${textMuted} text-center py-6`}>No hay fechas disponibles.</p>
          )}
          {schedules.map((s: any) => {
            const sel = selectedIds.includes(s.id);
            const full = !!s.full;
            return (
              <button
                key={s.id}
                type="button"
                disabled={full}
                onClick={() => toggle(s.id, full)}
                className={`w-full text-left rounded-xl border p-3.5 transition disabled:cursor-not-allowed ${cardBase} ${full ? 'opacity-60' : ''}`}
                style={sel ? { outline: `2px solid ${accent}`, borderColor: accent } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-semibold ${textMain} truncate`}>{s.label || s.scheduleName}</p>
                    <p className={`text-sm ${textMuted} capitalize mt-0.5`}><Calendar size={13} className="inline mr-1 -mt-0.5" style={{ color: accent }} />{fmtDate(s.startDateTime)}</p>
                    <p className={`text-sm ${textMuted}`}><Clock size={13} className="inline mr-1 -mt-0.5" style={{ color: accent }} />{fmtTime(s.startDateTime)} – {fmtTime(s.endDateTime)}</p>
                    {s.location && <p className={`text-sm ${textMuted}`}><MapPin size={13} className="inline mr-1 -mt-0.5" style={{ color: accent }} />{s.location}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {full ? (
                      <span className="text-[11px] font-semibold text-red-500 block max-w-[90px]">Capacidad máxima alcanzada</span>
                    ) : sel ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: accent }}><Check size={14} /></span>
                    ) : typeof s.spotsLeft === 'number' && s.spotsLeft <= 10 ? (
                      <span className="text-[11px] font-medium text-amber-500">quedan {s.spotsLeft}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className={`px-5 py-3 border-t ${borderCls} flex justify-end`}>
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2 text-white text-sm font-medium hover:brightness-110" style={{ backgroundColor: accent }}>
            {multiple ? 'Listo' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
