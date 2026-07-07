'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import useEventStore from '@/store/eventStore';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';

interface ParticipantImportProps {
  eventId: string;
  guestMode?: GuestMode;
  dietaryOptions?: string[];
  onClose: () => void;
  onImported?: () => void;
}

const GUEST_SLOTS = 5;
type GuestMode = 'named' | 'count' | 'companion';

const BASE_TARGETS = [
  { value: 'ignore', label: '— Ignorar —' },
  { value: 'firstName', label: 'Nombre' },
  { value: 'lastName', label: 'Apellido' },
  { value: 'email', label: 'Correo' },
  { value: 'documentNumber', label: 'RUT / Documento' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'company', label: 'Empresa' },
  { value: 'position', label: 'Cargo' },
  { value: 'numeroSap', label: 'Código SAP' },
  { value: 'dietaryPreference', label: 'Preferencia alimenticia' },
];

function guestTargets() {
  const opts: { value: string; label: string }[] = [];
  for (let n = 1; n <= GUEST_SLOTS; n++) {
    opts.push({ value: `guest${n}.firstName`, label: `Invitado ${n}: Nombre` });
    opts.push({ value: `guest${n}.documentNumber`, label: `Invitado ${n}: RUT` });
    opts.push({ value: `guest${n}.guestType`, label: `Invitado ${n}: Tipo` });
    opts.push({ value: `guest${n}.dietaryPreference`, label: `Invitado ${n}: Preferencia alimenticia` });
  }
  return opts;
}

// Targets de mapeo según el modo de invitados del evento.
function targetsForMode(mode: GuestMode) {
  if (mode === 'count') {
    return [...BASE_TARGETS, { value: 'guestCount', label: 'N° de invitados' }];
  }
  if (mode === 'companion') {
    return [
      ...BASE_TARGETS,
      { value: 'guestCompanion', label: 'Acompañante (sí/no)' },
      { value: 'guestLoads', label: 'N° de cargas' },
    ];
  }
  return [...BASE_TARGETS, { value: 'allowedGuests', label: 'Cantidad de invitados' }, ...guestTargets()];
}

function autodetect(header: string, mode: GuestMode): string {
  const h = (header || '').toLowerCase().trim();
  // Modo-específico primero.
  if (mode === 'count' && /invitad/.test(h)) return 'guestCount';
  if (mode === 'companion') {
    if (/acompa/.test(h)) return 'guestCompanion';
    if (/carga/.test(h)) return 'guestLoads';
  }
  if (mode === 'named') {
    const gnum = h.match(/invitado\s*(\d+)/);
    if (gnum) {
      const n = gnum[1];
      if (/rut|documento|dni/.test(h)) return `guest${n}.documentNumber`;
      if (/tipo/.test(h)) return `guest${n}.guestType`;
      if (/preferencia|aliment|dieta|comida/.test(h)) return `guest${n}.dietaryPreference`;
      if (/nombre/.test(h)) return `guest${n}.firstName`;
    }
    if (/acompa/.test(h)) return 'guest1.firstName';
    if (/cantidad.*invitad|invitados/.test(h)) return 'allowedGuests';
  }
  if (/apellido/.test(h)) return 'lastName';
  if (/nombre/.test(h)) return 'firstName';
  if (/correo|email|e-mail/.test(h)) return 'email';
  if (/rut|documento|dni/.test(h)) return 'documentNumber';
  if (/tel[eé]fono|fono|celular|m[oó]vil/.test(h)) return 'phone';
  if (/empresa|compa/.test(h)) return 'company';
  if (/cargo|puesto/.test(h)) return 'position';
  if (/sap/.test(h)) return 'numeroSap';
  if (/preferencia|aliment|dieta|comida/.test(h)) return 'dietaryPreference';
  return 'ignore';
}

const ParticipantImport: React.FC<ParticipantImportProps> = ({ eventId, guestMode = 'named', dietaryOptions, onClose, onImported }) => {
  const { EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const allTargets = targetsForMode(guestMode);
  const recommendedDiets = (dietaryOptions && dietaryOptions.length)
    ? dietaryOptions
    : ['Vegetariano', 'Vegano', 'Celíaco (sin gluten)', 'Kosher', 'Halal', 'Alergia'];

  // Etiqueta que distingue fechas aunque se repita el nombre o el día:
  // nombre · fecha hora · lugar (la key real es el id único de la fecha).
  const fmtSchedule = (s: any) => {
    const name = s.label || s.scheduleName || 'Fecha';
    let dt = '';
    try {
      const d = new Date(s.startDateTime);
      dt = ` · ${d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } catch { /* fecha inválida */ }
    return `${name}${dt}${s.location ? ` · ${s.location}` : ''}`;
  };
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
      hdrs.forEach((h) => { map[h] = autodetect(h, guestMode); });
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
    // Solo el RUT es obligatorio.
    return buildParticipants().filter((p) => p.documentNumber && String(p.documentNumber).trim()).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, headers, mapping]);

  const handleImport = async () => {
    const participants = buildParticipants().filter((p) => p.documentNumber && String(p.documentNumber).trim());
    if (participants.length === 0) {
      showToast.error('No hay filas válidas. Mapea la columna del RUT (es el único campo obligatorio).');
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
    const base1 = { 'Nombre': 'Juan', 'Apellido': 'Pérez', 'Correo': 'juan.perez@correo.cl', 'RUT': '12345678-9', 'Teléfono': '+56912345678', 'Empresa': 'ACME', 'Cargo': 'Gerente', 'Código SAP': 'SAP001', 'Preferencia alimenticia': 'Vegetariano' };
    const base2 = { 'Nombre': 'María', 'Apellido': 'González', 'Correo': 'maria.gonzalez@correo.cl', 'RUT': '9876543-2', 'Teléfono': '', 'Empresa': 'Globex', 'Cargo': 'Analista', 'Código SAP': '', 'Preferencia alimenticia': '' };

    let sample: any[];
    if (guestMode === 'count') {
      sample = [
        { ...base1, 'N° de invitados': 2 },
        { ...base2, 'N° de invitados': 0 },
      ];
    } else if (guestMode === 'companion') {
      sample = [
        { ...base1, 'Acompañante (sí/no)': 'Sí', 'N° de cargas': 2 },
        { ...base2, 'Acompañante (sí/no)': 'No', 'N° de cargas': 0 },
      ];
    } else {
      sample = [
        {
          ...base1, 'Cantidad de invitados': 2,
          'Invitado 1: Nombre': 'Ana Pérez', 'Invitado 1: RUT': '11111111-1', 'Invitado 1: Tipo': 'CARGA', 'Invitado 1: Preferencia alimenticia': 'Vegano',
          'Invitado 2: Nombre': 'Luis Soto', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': 'ACOMPANANTE', 'Invitado 2: Preferencia alimenticia': '',
        },
        {
          ...base2, 'Cantidad de invitados': 0,
          'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 1: Preferencia alimenticia': '',
          'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '', 'Invitado 2: Preferencia alimenticia': '',
        },
      ];
    }
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

              {/* Instrucciones de carga */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
                <p className="font-semibold">📋 Cómo llenar la planilla</p>
                <p>
                  <b>Solo el RUT es obligatorio.</b> Todo lo demás es opcional: Nombre, Apellido, Correo,
                  Teléfono, Empresa, Cargo, Código SAP y Preferencia alimenticia. La primera fila deben ser los
                  encabezados.
                </p>
                <div>
                  <p className="font-medium">Invitados:</p>
                  {guestMode === 'count' && (
                    <p>Este evento pide <b>solo el número</b> de invitados. Usa la columna <b>N° de invitados</b> (ej. 2).</p>
                  )}
                  {guestMode === 'companion' && (
                    <p>Este evento usa <b>acompañante + cargas</b>. Usa la columna <b>Acompañante (sí/no)</b> y la columna <b>N° de cargas</b> (ej. 2).</p>
                  )}
                  {guestMode === 'named' && (
                    <p>
                      Este evento pide <b>invitados con nombre</b>. Por cada invitado usa las columnas <b>Invitado 1: Nombre</b>,
                      <b> Invitado 1: RUT</b>, <b>Invitado 1: Tipo</b> y <b>Invitado 1: Preferencia alimenticia</b>. En <b>Tipo</b> escribe
                      <b> CARGA</b> o <b>ACOMPANANTE</b>. Repite con “Invitado 2: …”, “Invitado 3: …” para más invitados.
                    </p>
                  )}
                </div>
                <p className="text-blue-800/80">
                  <b>Importante:</b> la <b>precarga NO inscribe</b> a nadie. Solo habilita el <b>acceso al formulario</b>:
                  la persona entra a la landing, valida su RUT y <b>se inscribe ella misma</b>. Para precargar así, al
                  importar deja la opción “Sin fecha — dejar como precargados”.
                </p>
              </div>

              {/* Ayuda: opciones de preferencia alimenticia */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-1">🍽️ Preferencia alimenticia</p>
                <p className="text-amber-800/90">
                  Para que coincida con el sistema, copia una de estas opciones tal cual en la columna <b>Preferencia alimenticia</b>:
                </p>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {recommendedDiets.map((d) => (
                    <span key={d} className="inline-block bg-white border border-amber-300 text-amber-800 rounded-full px-2.5 py-0.5 text-xs font-medium">{d}</span>
                  ))}
                </div>
                <p className="text-amber-800/90">
                  Si escribes <b>otra opción</b> (ej. "Sin lactosa"), también se guarda y se muestra tal cual en la landing y en los reportes.
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
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white w-56"
                      >
                        {allTargets.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opción de fecha / estado */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">¿Precargar o inscribir en una fecha?</label>
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">Precargar (sin fecha) — se inscriben luego en la landing con su RUT</option>
                  {EventSchedules.map((s: any) => (
                    <option key={s.id} value={s.id}>Inscribir en: {fmtSchedule(s)}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  <b>Precargar</b> = quedan habilitados para inscribirse por la landing con su RUT (NO inscritos aún).
                  {' '}<b>Inscribir en una fecha</b> = quedan inscritos directamente en esa fecha (carga masiva, sin pasar por la landing).
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ El Excel <b>no necesita columna de fecha</b>: todos los participantes del archivo se inscribirán en la fecha que elijas aquí.
                </p>
              </div>

              {/* Confirmación de lo que se va a hacer */}
              {(() => {
                const sel = EventSchedules.find((s: any) => s.id === scheduleId);
                return (
                  <div className={`rounded-lg p-3 text-sm border ${sel ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    {sel
                      ? <>Vas a <b>inscribir {validCount} participante(s)</b> directamente en <b>{fmtSchedule(sel)}</b>.</>
                      : <>Vas a <b>precargar {validCount} participante(s)</b> (sin inscribir). Se inscribirán luego en la landing con su RUT.</>}
                  </div>
                );
              })()}

              <p className="text-sm text-gray-600">Filas válidas a importar (con RUT): <b>{validCount}</b> de {rows.length}</p>

              {/* Loader mientras importa (puede tardar con miles de filas) */}
              {importing && (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin flex-shrink-0" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-semibold">Importando {validCount} participante(s)…</p>
                    <p className="text-indigo-700/80">No cierres esta ventana. Con muchas filas puede tardar un poco.</p>
                  </div>
                </div>
              )}

              {/* Resultado: éxito + errores detallados */}
              {result && !importing && (
                <div className={`border rounded-lg p-4 text-sm ${result.errors?.length ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    {result.errors?.length
                      ? <><AlertTriangle className="h-5 w-5 text-amber-600" /> <span className="text-amber-800">Importación finalizada con {result.errors.length} error(es)</span></>
                      : <><CheckCircle2 className="h-5 w-5 text-green-600" /> <span className="text-green-800">Importación completada</span></>}
                  </div>
                  <p className="text-gray-700 mb-1">
                    📅 {(() => { const sel = EventSchedules.find((s: any) => s.id === scheduleId); return sel ? <>Inscritos en: <b>{fmtSchedule(sel)}</b></> : <b>Precarga (sin fecha)</b>; })()}
                  </p>
                  <p className="text-gray-700">
                    ✅ Creados: <b>{result.created}</b> · ♻️ Reusados (ya existían por RUT): <b>{result.reused}</b> · 👥 Invitados: <b>{result.guestsCreated}</b>
                    {result.errors?.length ? <> · ❌ Con error: <b>{result.errors.length}</b></> : null}
                  </p>
                  {result.errors?.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-amber-800 mb-1">Filas que NO se cargaron y por qué:</p>
                      <div className="border border-amber-200 rounded-md bg-white max-h-40 overflow-y-auto divide-y">
                        {result.errors.map((er: any, i: number) => (
                          <div key={i} className="px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-800">Fila {er.row}</span>
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
            <button onClick={handleImport} disabled={importing || validCount === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm inline-flex items-center gap-2">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              {importing ? 'Importando…' : `Importar ${validCount} participantes`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantImport;
