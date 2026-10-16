'use client';

import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle, Award } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';
import { isValidRut } from '@/utils/validators/rut';

interface ParticipantAwardImportProps {
  eventId: string;
  onClose: () => void;
  onImported?: () => void;
}

// Campos del sistema a los que puede apuntar una columna del Excel de premiados.
const TARGETS = [
  { value: 'ignore', label: '— Ignorar —' },
  { value: 'documentNumber', label: 'RUT / Documento' },
  { value: 'email', label: 'Correo' },
  { value: 'firstName', label: 'Nombre' },
  { value: 'lastName', label: 'Apellido' },
  { value: 'awardReason', label: 'Motivo del premio' },
];

const targetLabel = (v: string) => TARGETS.find((t) => t.value === v)?.label || v;

// Detección automática del campo según el encabezado de la columna.
function autodetect(header: string): string {
  const h = (header || '').toLowerCase().trim();
  if (/motivo|premio|raz[oó]n/.test(h)) return 'awardReason';
  if (/apellido/.test(h)) return 'lastName';
  if (/nombre/.test(h)) return 'firstName';
  if (/correo|email|e-mail/.test(h)) return 'email';
  if (/rut|documento|dni/.test(h)) return 'documentNumber';
  return 'ignore';
}

type Row = { documentNumber?: string; email?: string; firstName?: string; lastName?: string; awardReason?: string };

/**
 * Premiación masiva desde Excel/CSV, posterior a la carga del padrón. Cada fila se busca
 * entre los participantes que YA existen (por RUT, correo o nombre+apellido); los que se
 * encuentran quedan marcados como premiados con su motivo, los que no, se listan al final
 * sin marcar. No crea participantes ni toca ningún otro dato.
 */
const ParticipantAwardImport: React.FC<ParticipantAwardImportProps> = ({ eventId, onClose, onImported }) => {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
      const hdrs = json.length ? Object.keys(json[0]) : [];
      const map: Record<string, string> = {};
      for (const h of hdrs) map[h] = autodetect(h);
      setRows(json);
      setHeaders(hdrs);
      setMapping(map);
      setFileName(file.name);
      setResult(null);
    } catch {
      showToast.error('No se pudo leer el archivo. Usa CSV o Excel (.xlsx).');
    }
  };

  const buildRows = (): Row[] =>
    rows.map((row) => {
      const p: Row = {};
      for (const h of headers) {
        const t = mapping[h];
        if (!t || t === 'ignore') continue;
        const val = String(row[h] ?? '').trim();
        if (!val) continue;
        (p as any)[t] = val;
      }
      return p;
    });

  // ¿La fila se puede buscar? Con RUT: debe ser válido. Sin RUT: correo, o nombre/apellido.
  const rowOk = (p: Row) => {
    const rut = String(p.documentNumber ?? '').trim();
    if (rut) return isValidRut(rut);
    return !!(p.email || p.firstName || p.lastName);
  };

  const built = useMemo(() => buildRows(), [rows, headers, mapping]); // eslint-disable-line react-hooks/exhaustive-deps
  const validCount = useMemo(() => built.filter(rowOk).length, [built]);
  const invalidRuts = useMemo(
    () => built
      .map((p, idx) => ({ row: idx + 2, rut: p.documentNumber, name: `${p.firstName || ''} ${p.lastName || ''}`.trim() }))
      .filter((p) => p.rut && !isValidRut(String(p.rut))),
    [built]
  );
  const hasIdentity = useMemo(
    () => Object.values(mapping).some((t) => ['documentNumber', 'email', 'firstName', 'lastName'].includes(t)),
    [mapping]
  );
  const hasReason = useMemo(() => Object.values(mapping).includes('awardReason'), [mapping]);

  // Dos columnas apuntando al mismo campo: la última pisaría a la primera. Se bloquea.
  const duplicateTargets = useMemo(() => {
    const byTarget: Record<string, string[]> = {};
    for (const h of headers) {
      const t = mapping[h];
      if (!t || t === 'ignore') continue;
      (byTarget[t] = byTarget[t] || []).push(h);
    }
    return Object.entries(byTarget).filter(([, hs]) => hs.length > 1);
  }, [headers, mapping]);
  const duplicatedTargetSet = useMemo(() => new Set(duplicateTargets.map(([t]) => t)), [duplicateTargets]);

  const handleImport = async () => {
    if (duplicateTargets.length > 0) {
      showToast.error('Hay columnas repetidas apuntando al mismo campo. Corrige el mapeo antes de premiar.');
      return;
    }
    if (validCount === 0) {
      showToast.error('No hay filas válidas. Cada fila necesita un RUT válido, un correo o un nombre.');
      return;
    }
    // Se envían TODAS las filas (las inválidas vuelven en `errors`): así el índice que
    // devuelve el servidor (row) coincide con la fila del Excel (row + 1, por el encabezado).
    const participants = built;
    setImporting(true);
    try {
      const res = await apiClient.post<any>(`/api/events/${eventId}/participants/award-import`, { participants });
      setResult(res);
      showToast.success(`Premiados: ${res.awarded}${res.alreadyAwarded ? ` · Ya premiados: ${res.alreadyAwarded}` : ''}${res.notFound?.length ? ` · No encontrados: ${res.notFound.length}` : ''}`);
      if (onImported) onImported();
    } catch (e: any) {
      showToast.error(e.message || 'Error al premiar.');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setHeaders([]); setRows([]); setMapping({}); setFileName(''); setResult(null); };

  const downloadTemplate = () => {
    const sample = [
      { 'RUT': '12345678-9', 'Nombre': 'Juan', 'Apellido': 'Pérez', 'Correo': 'juan.perez@correo.cl', 'Motivo premio': 'Sorteo' },
      { 'RUT': '9876543-2', 'Nombre': 'María', 'Apellido': 'González', 'Correo': '', 'Motivo premio': 'Mejor disfraz' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Premiados');
    XLSX.writeFile(wb, 'plantilla_premiados.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2"><Award size={22} className="text-amber-600" /> Premiar por Excel / CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-5">
          {headers.length === 0 ? (
            <>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-amber-500 block">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Haz clic para seleccionar un archivo <b>CSV</b> o <b>Excel (.xlsx)</b> con los premiados</p>
                <p className="text-xs text-gray-500 mt-1">La primera fila debe tener los encabezados de columna.</p>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
              <div className="text-center">
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium">
                  <Download size={16} /> Descargar plantilla de ejemplo
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 space-y-2">
                <p className="font-semibold">🏆 Cómo funciona</p>
                <p>
                  Esta carga <b>no crea participantes</b>: solo marca como <b>premiados</b> a personas que <b>ya están</b> en el
                  padrón del evento (inscritas o precargadas). Cada fila se busca por <b>RUT</b> o <b>Correo</b>; si no trae
                  ninguno, por <b>Nombre y Apellido</b> exactos (solo si hay una sola coincidencia).
                </p>
                <p>
                  La columna <b>Motivo premio</b> es opcional y se muestra en la ficha al acreditar. Quien no se encuentre en el
                  padrón <b>no se marca</b> y aparece en una lista al final para que lo revises.
                </p>
                <p className="text-amber-800/80">
                  Los que ya estaban premiados se conservan; solo se les actualiza el motivo si el Excel trae uno distinto.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-gray-500">· {rows.length} filas</span>
                </div>
                <button onClick={reset} className="text-sm text-gray-500 hover:text-red-600">Cambiar archivo</button>
              </div>

              {/* Mapeo de columnas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Mapeo de columnas</h3>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm text-gray-700 truncate flex-1" title={h}>{h}</span>
                      <select
                        value={mapping[h] || 'ignore'}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                        className={`text-sm border rounded-md px-2 py-1 bg-white w-56 ${duplicatedTargetSet.has(mapping[h]) ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-300'}`}
                      >
                        {TARGETS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
                {!hasIdentity && (
                  <p className="text-xs text-red-600 mt-1">Asigna al menos una columna a RUT, Correo o Nombre/Apellido para poder buscar a las personas.</p>
                )}
                {!hasReason && hasIdentity && (
                  <p className="text-xs text-gray-500 mt-1">Sin columna de motivo: se marcarán como premiados sin motivo.</p>
                )}
              </div>

              {duplicateTargets.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-red-800 flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" /> Hay columnas repetidas apuntando al mismo campo
                  </p>
                  <ul className="list-disc pl-5 text-red-700/90 space-y-0.5">
                    {duplicateTargets.map(([t, hs]) => (
                      <li key={t}><b>{targetLabel(t)}</b> ← columnas: {hs.map((h) => `“${h}”`).join(', ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {invalidRuts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-amber-800 mb-1">⚠️ {invalidRuts.length} fila(s) con RUT inválido no se enviarán:</p>
                  <div className="max-h-28 overflow-y-auto text-xs text-amber-900 space-y-0.5">
                    {invalidRuts.map((r) => (
                      <div key={r.row}>Fila {r.row} · RUT {String(r.rut)}{r.name ? ` · ${r.name}` : ''}</div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-700">
                Se buscarán <b>{validCount}</b> personas en el padrón. Las que existan quedarán <b>premiadas</b>; las que no, se listarán sin marcar.
              </p>

              {/* Resultado */}
              {result && !importing && (
                <div className={`border rounded-lg p-4 text-sm ${(result.notFound?.length || result.errors?.length) ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    {(result.notFound?.length || result.errors?.length)
                      ? <><AlertTriangle className="h-5 w-5 text-amber-600" /> <span className="text-amber-800">Premiación finalizada con avisos</span></>
                      : <><CheckCircle2 className="h-5 w-5 text-green-600" /> <span className="text-green-800">Premiación completada</span></>}
                  </div>
                  <p className="text-gray-700">
                    🏆 Premiados: <b>{result.awarded}</b>
                    {result.alreadyAwarded ? <> · ♻️ Ya estaban premiados: <b>{result.alreadyAwarded}</b>{result.reasonUpdated ? <> (motivo actualizado: {result.reasonUpdated})</> : null}</> : null}
                    {result.notFound?.length ? <> · 🔍 No encontrados: <b>{result.notFound.length}</b></> : null}
                    {result.errors?.length ? <> · ❌ Con error: <b>{result.errors.length}</b></> : null}
                  </p>
                  {result.notFound?.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-amber-800 mb-1">No están en el padrón (NO se marcaron). Inscríbelos o precárgalos primero y vuelve a cargar solo estas filas:</p>
                      <div className="border border-amber-200 rounded-md bg-white max-h-40 overflow-y-auto divide-y">
                        {result.notFound.map((nf: any, i: number) => (
                          <div key={i} className="px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-800">Fila {nf.row + 1}</span>
                            {nf.rut ? <span className="text-gray-500"> · RUT {nf.rut}</span> : null}
                            {nf.email ? <span className="text-gray-500"> · {nf.email}</span> : null}
                            {nf.name ? <span className="text-gray-500"> · {nf.name}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-amber-800 mb-1">Filas con error (NO se marcaron):</p>
                      <div className="border border-amber-200 rounded-md bg-white max-h-40 overflow-y-auto divide-y">
                        {result.errors.map((er: any, i: number) => (
                          <div key={i} className="px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-800">Fila {er.row + 1}</span>
                            {er.rut ? <span className="text-gray-500"> · RUT {er.rut}</span> : null}
                            {er.name ? <span className="text-gray-500"> · {er.name}</span> : null}
                            <span className="block text-red-600">{er.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">Cerrar</button>
          {headers.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0 || duplicateTargets.length > 0 || !hasIdentity}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm inline-flex items-center gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              {importing ? 'Premiando…' : `Premiar ${validCount} participantes`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantAwardImport;
