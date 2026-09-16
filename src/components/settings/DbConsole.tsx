'use client';

import React, { useState } from 'react';
import { Database, Play, Loader2, AlertTriangle } from 'lucide-react';
import apiClient from '@/utils/apiClient';

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  truncated: boolean;
}

const cell = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const DbConsole: React.FC = () => {
  const [sql, setSql] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!sql.trim()) { setError('Escribe una consulta SELECT.'); return; }
    if (!passphrase) { setError('Ingresa la passphrase de la consola.'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post<QueryResult>('/api/admin/db-query', { sql, passphrase });
      setResult(res);
    } catch (e: any) {
      setError(e?.message || 'No se pudo ejecutar la consulta.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter ejecuta.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <Database size={20} /> Consola de base de datos <span className="text-xs font-normal text-gray-500">(solo lectura)</span>
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        Ejecuta consultas <b>SELECT</b> sobre la base y ve los resultados. Solo lectura: no permite
        modificar datos. Requiere la passphrase configurada en el servidor. Máx. 1000 filas.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mb-4 flex items-start gap-2">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          Puedes ver datos personales de todos los eventos. Úsala con cuidado. Si el servidor no
          tiene la consola habilitada (<code>DB_CONSOLE_ENABLED</code>) y una passphrase
          (<code>DB_CONSOLE_PASSPHRASE</code>), esta pantalla no funcionará.
        </span>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">Consulta SQL (SELECT)</label>
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={onKeyDown}
        rows={6}
        spellCheck={false}
        placeholder={"SELECT e.name, count(g.*) AS invitados, count(g.age) AS con_edad\nFROM guests g\nJOIN participants p ON p.id = g.participant_id\nJOIN events e ON e.id = p.event_id\nWHERE g.deleted_at IS NULL\nGROUP BY e.name"}
        className="w-full font-mono text-sm rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="off"
            className="w-full sm:max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Ejecutar <span className="opacity-70 text-xs hidden sm:inline">(Ctrl+Enter)</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">
            {result.rowCount} fila{result.rowCount === 1 ? '' : 's'}
            {result.truncated && <span className="text-amber-700"> · resultado recortado a {result.rowCount} (hay más)</span>}
          </p>
          {result.columns.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="text-left font-semibold text-gray-700 px-3 py-2 whitespace-nowrap border-b">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                      {result.columns.map((c) => (
                        <td key={c} className="px-3 py-1.5 whitespace-nowrap border-b border-gray-100 text-gray-800">{cell(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">La consulta no devolvió filas.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default DbConsole;
