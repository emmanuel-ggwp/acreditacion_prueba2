'use client';

import React from 'react';
import type { CustomQuestion, CustomAnswers } from '@/utils/customQuestions';

interface Props {
  questions: CustomQuestion[];
  answers: CustomAnswers;
  onChange: (answers: CustomAnswers) => void;
  // 'light' para formularios claros (admin / plantillas claras); 'dark' para Gala.
  tone?: 'light' | 'dark';
  accent?: string; // color del botón "Sí/No" seleccionado
}

/**
 * Renderiza preguntas "Sí/No + lista". Comportamiento pedido:
 * - Si eligen "No": el desplegable queda vacío y deshabilitado (no se puede elegir).
 * - Si eligen "Sí": el desplegable se habilita.
 * - Si cambian de "Sí" a "No": el valor elegido se limpia.
 * Es controlado (answers / onChange) para reutilizarse en landings y admin.
 */
export default function CustomQuestionFields({ questions, answers, onChange, tone = 'light', accent = '#4f46e5' }: Props) {
  if (!questions || questions.length === 0) return null;
  const dark = tone === 'dark';

  const setEnabled = (key: string, label: string, enabled: boolean) => {
    const cur = answers[key] || { label, enabled: false, value: null };
    // Al pasar a "No" se limpia la opción elegida.
    onChange({ ...answers, [key]: { ...cur, label, enabled, value: enabled ? cur.value : null } });
  };
  const setVal = (key: string, label: string, value: string) => {
    const cur = answers[key] || { label, enabled: true, value: null };
    onChange({ ...answers, [key]: { ...cur, label, enabled: true, value: value || null } });
  };

  const labelCls = `block text-sm font-medium ${dark ? 'text-white' : 'text-gray-700'}`;
  const subCls = `block text-xs mb-1 ${dark ? 'text-white/80' : 'text-gray-500'}`;
  const selectCls = dark
    ? 'w-full px-3 py-2 rounded-md text-sm border disabled:opacity-50 disabled:cursor-not-allowed'
    : 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';
  const selectStyle: React.CSSProperties | undefined = dark
    ? { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }
    : undefined;
  const optStyle = dark ? { color: '#111' } : undefined;

  const toggleBtnStyle = (active: boolean): React.CSSProperties =>
    active
      ? { backgroundColor: accent, color: '#fff', borderColor: accent }
      : dark
        ? { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }
        : { backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' };

  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const a = answers[q.key] || { label: q.label, enabled: false, value: null };
        return (
          <div key={q.key}>
            <label className={labelCls}>{q.label}{q.required ? ' *' : ''}</label>
            <div className="mt-1 flex gap-2">
              {([['Sí', true], ['No', false]] as const).map(([lbl, val]) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setEnabled(q.key, q.label, val)}
                  className="px-5 py-2 rounded-md text-sm font-medium border transition"
                  style={toggleBtnStyle(a.enabled === val)}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="mt-2">
              {q.selectLabel && <label className={subCls}>{q.selectLabel}</label>}
              <select
                value={a.enabled ? (a.value || '') : ''}
                disabled={!a.enabled}
                onChange={(e) => setVal(q.key, q.label, e.target.value)}
                className={selectCls}
                style={selectStyle}
              >
                <option value="" style={optStyle}>{a.enabled ? 'Selecciona…' : '—'}</option>
                {q.options.map((o) => (
                  <option key={o} value={o} style={optStyle}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
