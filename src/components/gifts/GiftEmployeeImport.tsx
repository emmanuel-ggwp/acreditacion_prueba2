'use client';

import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileSpreadsheet, Download } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';

interface Props {
  campaignId: string;
  onClose: () => void;
  onImported?: () => void;
}

const TARGETS = [
  { value: 'ignore', label: '— Ignorar —' },
  { value: 'fullName', label: 'Nombre empleado' },
  { value: 'rut', label: 'RUT' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'cargas', label: 'Cantidad de cargas' },
  { value: 'cargasHijos', label: 'Cantidad de cargas hijos' },
];

function autodetect(header: string): string {
  const h = (header || '').toLowerCase().trim();
  if (/hijo/.test(h)) return 'cargasHijos'; // "cargas hijos" antes que "cargas"
  if (/carga|dependiente/.test(h)) return 'cargas';
  if (/rut|documento|dni/.test(h)) return 'rut';
  if (/empresa|compa[ñn]/.test(h)) return 'empresa';
  if (/nombre|empleado|trabajador|colaborador|funcionario/.test(h)) return 'fullName';
  return 'ignore';
}

const GiftEmployeeImport: React.FC<Props> = ({ campaignId, onClose, onImported }) => {
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
      if (!json.length) { showToast.error('El archivo está vacío.'); return; }
      const hdrs = Object.keys(json[0]);
      const map: Record<string, string> = {};
      hdrs.forEach((h) => { map[h] = autodetect(h); });
      setHeaders(hdrs); setRows(json); setMapping(map); setFileName(file.name); setResult(null);
    } catch {
      showToast.error('No se pudo leer el archivo. Usa CSV o Excel (.xlsx).');
    }
  };

  const buildRows = () => rows.map((row) => {
    const r: any = {};
    for (const h of headers) {
      const t = mapping[h];
      if (!t || t === 'ignore') continue;
      const val = String(row[h] ?? '').trim();
      if (t === 'cargas' || t === 'cargasHijos') r[t] = parseInt(val, 10) || 0;
      else r[t] = val;
    }
    return r;
  });

  const validCount = useMemo(() => buildRows().filter((r) => r.fullName).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, headers, mapping]);

  const handleImport = async () => {
    const data = buildRows().filter((r) => r.fullName);
    if (!data.length) { showToast.error('No hay filas válidas. Mapea al menos la columna de Nombre.'); return; }
    setImporting(true);
    try {
      const res = await apiClient.post<any>(`/api/gift-campaigns/${campaignId}/employees/import`, { rows: data });
      setResult(res);
      showToast.success(`Creados: ${res.created} · Actualizados: ${res.updated}`);
      if (onImported) onImported();
    } catch (e: any) {
      showToast.error(e.message || 'Error al importar.');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setHeaders([]); setRows([]); setMapping({}); setFileName(''); setResult(null); };

  const downloadTemplate = () => {
    const sample = [
      { 'Nombre': 'Pedro Ramírez', 'RUT': '12345678-9', 'Empresa': 'ACME', 'Cantidad de cargas': 3, 'Cantidad de cargas hijos': 2 },
      { 'Nombre': 'Lucía Fernández', 'RUT': '9876543-2', 'Empresa': 'Globex', 'Cantidad de cargas': 1, 'Cantidad de cargas hijos': 1 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSX.writeFile(wb, 'plantilla_empleados_regalos.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Importar empleados (Excel / CSV)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-5">
          {headers.length === 0 ? (
            <>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-500 block">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Haz clic para seleccionar un archivo <b>CSV</b> o <b>Excel (.xlsx)</b></p>
                <p className="text-xs text-gray-500 mt-1">Columnas: nombre, RUT, empresa, cantidad de cargas, cantidad de cargas hijos.</p>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
              <div className="text-center">
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  <Download size={16} /> Descargar plantilla de ejemplo
                </button>
                <p className="text-xs text-gray-400 mt-1">Un Excel con las columnas correctas y filas de ejemplo.</p>
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

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Mapeo de columnas</h3>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm text-gray-700 truncate flex-1" title={h}>{h}</span>
                      <select
                        value={mapping[h] || 'ignore'}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white w-56"
                      >
                        {TARGETS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-600">Filas válidas (con Nombre): <b>{validCount}</b> de {rows.length}</p>

              {result && (
                <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                  <p>Creados: <b>{result.created}</b> · Actualizados: <b>{result.updated}</b></p>
                  {result.errors?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600">{result.errors.length} errores</summary>
                      <ul className="mt-1 list-disc pl-5 text-red-600 max-h-32 overflow-y-auto">
                        {result.errors.map((er: any, i: number) => (<li key={i}>Fila {er.row}: {er.error}</li>))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">Cerrar</button>
          {headers.length > 0 && (
            <button onClick={handleImport} disabled={importing || validCount === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
              {importing ? 'Importando…' : `Importar ${validCount} empleados`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftEmployeeImport;
