'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileSpreadsheet, Download } from 'lucide-react';
import useEventStore from '@/store/eventStore';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';

interface ParticipantImportProps {
  eventId: string;
  onClose: () => void;
  onImported?: () => void;
}

const GUEST_SLOTS = 5;

const PARTICIPANT_TARGETS = [
  { value: 'ignore', label: '— Ignorar —' },
  { value: 'firstName', label: 'Nombre' },
  { value: 'lastName', label: 'Apellido' },
  { value: 'email', label: 'Correo' },
  { value: 'documentNumber', label: 'RUT / Documento' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'company', label: 'Empresa' },
  { value: 'position', label: 'Cargo' },
  { value: 'numeroSap', label: 'Código SAP' },
  { value: 'allowedGuests', label: 'Cantidad de invitados' },
];

function guestTargets() {
  const opts: { value: string; label: string }[] = [];
  for (let n = 1; n <= GUEST_SLOTS; n++) {
    opts.push({ value: `guest${n}.firstName`, label: `Invitado ${n}: Nombre` });
    opts.push({ value: `guest${n}.documentNumber`, label: `Invitado ${n}: RUT` });
    opts.push({ value: `guest${n}.guestType`, label: `Invitado ${n}: Tipo` });
  }
  return opts;
}
const ALL_TARGETS = [...PARTICIPANT_TARGETS, ...guestTargets()];

function autodetect(header: string): string {
  const h = (header || '').toLowerCase().trim();
  const gnum = h.match(/invitado\s*(\d+)/);
  if (gnum) {
    const n = gnum[1];
    if (/rut|documento|dni/.test(h)) return `guest${n}.documentNumber`;
    if (/tipo/.test(h)) return `guest${n}.guestType`;
    if (/nombre/.test(h)) return `guest${n}.firstName`;
  }
  if (/acompa/.test(h)) return 'guest1.firstName';
  if (/cantidad.*invitad|invitados/.test(h)) return 'allowedGuests';
  if (/apellido/.test(h)) return 'lastName';
  if (/nombre/.test(h)) return 'firstName';
  if (/correo|email|e-mail/.test(h)) return 'email';
  if (/rut|documento|dni/.test(h)) return 'documentNumber';
  if (/tel[eé]fono|fono|celular|m[oó]vil/.test(h)) return 'phone';
  if (/empresa|compa/.test(h)) return 'company';
  if (/cargo|puesto/.test(h)) return 'position';
  if (/sap/.test(h)) return 'numeroSap';
  return 'ignore';
}

const ParticipantImport: React.FC<ParticipantImportProps> = ({ eventId, onClose, onImported }) => {
  const { EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [scheduleId, setScheduleId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { fetchSchedulesForEvent(eventId); }, [eventId, fetchSchedulesForEvent]);

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
      setHeaders(hdrs);
      setRows(json);
      setMapping(map);
      setFileName(file.name);
      setResult(null);
    } catch (e: any) {
      showToast.error('No se pudo leer el archivo. Usa CSV o Excel (.xlsx).');
    }
  };

  const buildParticipants = () => {
    return rows.map((row) => {
      const p: any = {};
      const guests: Record<string, any> = {};
      for (const h of headers) {
        const t = mapping[h];
        if (!t || t === 'ignore') continue;
        const val = String(row[h] ?? '').trim();
        if (!val) continue;
        if (t.startsWith('guest')) {
          const [g, field] = t.split('.');
          guests[g] = guests[g] || {};
          guests[g][field] = val;
        } else if (t === 'allowedGuests') {
          p[t] = parseInt(val, 10) || 0;
        } else {
          p[t] = val;
        }
      }
      const guestArr = Object.values(guests).filter((g: any) => g.firstName);
      return { ...p, guests: guestArr };
    });
  };

  const validCount = useMemo(() => {
    if (!rows.length) return 0;
    return buildParticipants().filter((p) => p.firstName && p.email).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, headers, mapping]);

  const handleImport = async () => {
    const participants = buildParticipants().filter((p) => p.firstName && p.email);
    if (participants.length === 0) {
      showToast.error('No hay filas válidas. Mapea al menos las columnas de Nombre y Correo.');
      return;
    }
    setImporting(true);
    try {
      const res = await apiClient.post<any>(`/api/events/${eventId}/participants/import`, {
        scheduleId: scheduleId || null,
        participants,
      });
      setResult(res);
      showToast.success(`Importados: ${res.created} · Reusados: ${res.reused} · Invitados: ${res.guestsCreated}`);
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
      {
        'Nombre': 'Juan', 'Apellido': 'Pérez', 'Correo': 'juan.perez@correo.cl', 'RUT': '12345678-9',
        'Teléfono': '+56912345678', 'Empresa': 'ACME', 'Cargo': 'Gerente', 'Código SAP': 'SAP001',
        'Cantidad de invitados': 2,
        'Invitado 1: Nombre': 'Ana Pérez', 'Invitado 1: RUT': '11111111-1', 'Invitado 1: Tipo': 'CARGA',
        'Invitado 2: Nombre': 'Luis Soto', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': 'ACOMPANANTE',
      },
      {
        'Nombre': 'María', 'Apellido': 'González', 'Correo': 'maria.gonzalez@correo.cl', 'RUT': '9876543-2',
        'Teléfono': '', 'Empresa': 'Globex', 'Cargo': 'Analista', 'Código SAP': '',
        'Cantidad de invitados': 0,
        'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '',
        'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    XLSX.writeFile(wb, 'plantilla_participantes.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Importar participantes (Excel / CSV)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-5">
          {headers.length === 0 ? (
            <>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-500 block">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Haz clic para seleccionar un archivo <b>CSV</b> o <b>Excel (.xlsx)</b></p>
                <p className="text-xs text-gray-500 mt-1">La primera fila debe tener los encabezados de columna.</p>
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
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white w-56"
                      >
                        {ALL_TARGETS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opción de fecha / estado */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Asignar a una fecha (opcional)</label>
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">Sin fecha — dejar como precargados (se inscriben luego)</option>
                  {EventSchedules.map((s: any) => (
                    <option key={s.id} value={s.id}>{(s.label || s.scheduleName)} — inscribir directamente</option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-gray-600">Filas válidas a importar (con Nombre y Correo): <b>{validCount}</b> de {rows.length}</p>

              {result && (
                <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                  <p>Creados: <b>{result.created}</b> · Reusados: <b>{result.reused}</b> · Invitados: <b>{result.guestsCreated}</b></p>
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
              {importing ? 'Importando…' : `Importar ${validCount} participantes`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantImport;
