'use client';

import React, { useState } from 'react';
import { DatabaseZap, Eye, Loader2, AlertTriangle, Check, X as XIcon } from 'lucide-react';
import apiClient from '@/utils/apiClient';

interface PreviewResult {
  mode: 'preview';
  operation: string;
  table: string | null;
  affected: number;
  columns: string[];
  rows: Record<string, any>[];
  truncated: boolean;
}
interface ApplyResult {
  mode: 'apply';
  operation: string;
  table: string | null;
  affected: number;
}

const cell = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const DbEditor: React.FC = () => {
  const [sql, setSql] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewedSql, setPreviewedSql] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState<ApplyResult | null>(null);

  // La vista previa solo vale para la sentencia exacta que se previsualizó.
  const previewStale = preview !== null && previewedSql !== sql;
  const canApply = preview !== null && !previewStale;

  const onSqlChange = (v: string) => {
    setSql(v);
    setConfirming(false);
    setApplied(null);
  };

  const doPreview = async () => {
    setError(null);
    setApplied(null);
    setConfirming(false);
    if (!sql.trim()) { setError('Escribe una sentencia (UPDATE, DELETE o INSERT).'); return; }
    if (!passphrase) { setError('Ingresa la passphrase del editor.'); return; }
    setBusy('preview');
    try {
      const res = await apiClient.post<PreviewResult>('/api/admin/db-edit', { sql, passphrase, mode: 'preview' });
      setPreview(res);
      setPreviewedSql(sql);
    } catch (e: any) {
      setPreview(null);
      setPreviewedSql(null);
      setError(e?.message || 'No se pudo previsualizar.');
    } finally {
      setBusy(null);
    }
  };

  const doApply = async () => {
    setError(null);
    setBusy('apply');
    try {
      const res = await apiClient.post<ApplyResult>('/api/admin/db-edit', { sql, passphrase, mode: 'apply' });
      setApplied(res);
      setPreview(null);
      setPreviewedSql(null);
      setConfirming(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo aplicar el cambio.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <DatabaseZap size={20} /> Editor de base de datos <span className="text-xs font-normal text-rose-600">(modifica datos)</span>
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        Ejecuta <b>UPDATE</b>, <b>DELETE</b> o <b>INSERT</b>. Primero <b>previsualiza</b> (te dice cuántas filas
        se editarán y cómo quedarían, sin cambiar nada) y recién al <b>confirmar</b> se aplica. Cada cambio
        aplicado queda registrado en <b>Actividad</b>.
      </p>

      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 mb-4 flex items-start gap-2">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          Esto <b>modifica la base de datos directamente</b>, saltándose las validaciones de la aplicación.
          Úsalo con mucho cuidado. Debe estar habilitado en el servidor (<code>DB_EDITOR_ENABLED</code>) y tener
          su propia passphrase (<code>DB_EDITOR_PASSPHRASE</code>). Los cambios de esquema (ALTER/CREATE) van por
          migraciones, no por aquí.
        </span>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">Sentencia SQL (UPDATE / DELETE / INSERT)</label>
      <textarea
        value={sql}
        onChange={(e) => onSqlChange(e.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={"UPDATE audit_logs AS al\n   SET event_id = es.event_id\n  FROM event_schedules AS es\n WHERE al.entity = 'Accreditation'\n   AND al.event_id IS NULL\n   AND al.details->>'eventScheduleId' = es.id::text"}
        className="w-full font-mono text-sm rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
      />

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Passphrase del editor</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="off"
            className="w-full sm:max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <button
          onClick={doPreview}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
          Previsualizar
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      {applied && (
        <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center gap-2">
          <Check size={16} /> Listo: se {applied.affected === 1 ? 'editó' : 'editaron'} <b>{applied.affected}</b> fila{applied.affected === 1 ? '' : 's'}
          {applied.table ? <> en <code>{applied.table}</code></> : null} ({applied.operation}). Quedó registrado en Actividad.
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-3">
            Se {preview.affected === 1 ? 'editará' : 'editarán'} <b>{preview.affected}</b> fila{preview.affected === 1 ? '' : 's'}
            {preview.table ? <> en <code>{preview.table}</code></> : null} ({preview.operation}).
            {preview.affected > 0 && <> Abajo, así quedarían{preview.truncated ? <span className="text-amber-700"> (muestra de las primeras {preview.rows.length})</span> : null}:</>}
            {preview.affected === 0 && <> No hay filas que coincidan: no se cambiaría nada.</>}
            <span className="block text-xs text-amber-700 mt-1">Esta vista previa no modificó nada (se revirtió).</span>
          </div>

          {previewStale && (
            <div className="rounded-md bg-gray-100 border border-gray-200 p-3 text-sm text-gray-600 mb-3">
              Cambiaste la sentencia. Vuelve a <b>previsualizar</b> antes de aplicar.
            </div>
          )}

          {preview.rows.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-3">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.columns.map((c) => (
                      <th key={c} className="text-left font-semibold text-gray-700 px-3 py-2 whitespace-nowrap border-b">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                      {preview.columns.map((c) => (
                        <td key={c} className="px-3 py-1.5 whitespace-nowrap border-b border-gray-100 text-gray-800">{cell(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.affected > 0 && canApply && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              <DatabaseZap size={16} /> Aplicar cambios ({preview.affected} fila{preview.affected === 1 ? '' : 's'})
            </button>
          )}

          {confirming && canApply && (
            <div className="rounded-md bg-rose-50 border border-rose-300 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm text-rose-900 flex-1">
                ¿Seguro? Esto modificará <b>{preview.affected}</b> fila{preview.affected === 1 ? '' : 's'} de forma permanente.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={doApply}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy === 'apply' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Sí, aplicar
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  <XIcon size={16} /> Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DbEditor;
