'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { dietaryLabel, dietaryFull } from '@/utils/dietary';
import { formatDateCL, formatTimeCL, formatDateTimeCL } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Award, CheckCircle, Download, Utensils, ChevronDown, CalendarDays } from 'lucide-react';
import { downloadEventAccreditedReport } from '@/utils/generateReport';
import { showToast } from '@/components/ui/Toast';


interface EventReportProps {
  eventId: string;
}

interface ReportData {
  eventInfo: any;
  participantStats: {
    registered: number;
    registeredGuests: number;
    totalRegistered: number;
    accredited: number;
    accreditedGuests: number;
    totalAccredited: number;
    attendanceRate: number;
  };
  scheduleStats: {
    scheduleName: string;
    startDateTime: string;
    endDateTime: string;
    capacity: number;
    maxAttendees: number | null;
    registered: number;
    registeredParticipants: number;
    registeredGuests: number;
    accreditedTotal: number;
    accreditedParticipants: number;
    accreditedGuests: number;
    capacityUsedPercentage: number;
  }[];
  awardStats: {
    assigned: number;
    delivered: number;
    deliveryRate: number;
  };
  accreditationTimeline: {
    hour: string;
    count: number;
  }[];
}

// Fechas en hora de Chile (es-CL + America/Santiago), no la del navegador.
const fmtDate = (d?: string | null) => (d ? formatDateCL(d, { weekday: 'short', day: '2-digit', month: 'short' }) : '');
const fmtDateShort = (d?: string | null) => (d ? formatDateCL(d, { day: '2-digit', month: 'short' }) : '');
const EventReport: React.FC<EventReportProps> = ({ eventId }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Restricción alimenticia desplegada (para mostrar quiénes la tienen).
  const [openDiet, setOpenDiet] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dietError, setDietError] = useState(false);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let lastDietRefresh: number | null = null;
    const fetchReport = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const reportData = await apiClient.get<ReportData>(`/api/reports/events/${eventId}`);
        if (!active) return;
        setData(reportData); setLastUpdated(new Date()); setError(null);
        if (lastDietRefresh === null || Date.now() - lastDietRefresh >= 60000) try {
          const att = await apiClient.get<any[]>(`/api/events/${eventId}/export`);
          if (active) {
            setAttendees(Array.isArray(att) ? att : []);
            lastDietRefresh = Date.now();
            setDietError(false);
          }
        } catch { if (active) setDietError(true); }
      } catch {
        if (active) setError('No se pudieron actualizar los reportes del evento');
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    setAttendees([]); setDietError(false);
    if (eventId) void fetchReport();
    const timer = setInterval(() => { if (eventId) void fetchReport(); }, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [eventId]);

  if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center">No hay datos disponibles</div>;

  // Resumen de preferencias alimenticias (participantes + invitados), excluyendo "Ninguna".
  // dietPeople guarda, por preferencia, quiénes la tienen (para desplegar al presionar).
  const dietCounts: Record<string, number> = {};
  const dietPeople: Record<string, { name: string; tipo: 'Participante' | 'Invitado'; pertenece?: string }[]> = {};
  let dietTotal = 0;
  for (const p of attendees) {
    const add = (v: any, name: string, tipo: 'Participante' | 'Invitado', pertenece?: string) => {
      if (v && v !== 'NONE') {
        dietCounts[v] = (dietCounts[v] || 0) + 1;
        (dietPeople[v] = dietPeople[v] || []).push({ name: name || '(sin nombre)', tipo, pertenece });
        dietTotal++;
      }
    };
    const pName = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
    add(p?.dietaryPreference, pName, 'Participante');
    for (const g of (p?.guests || [])) add(g?.dietaryPreference, `${g?.firstName || ''} ${g?.lastName || ''}`.trim(), 'Invitado', pName);
  }
  const dietEntries = Object.entries(dietCounts).sort((a, b) => b[1] - a[1]);

  // Datos para el gráfico por fecha: etiqueta con nombre + fecha, inscritos vs acreditados.
  const scheduleChart = data.scheduleStats.map((s) => ({
    label: `${s.scheduleName} · ${fmtDateShort(s.startDateTime)}`,
    Inscritos: s.registered || 0,
    Acreditados: s.accreditedTotal || 0,
  }));

  // Reconsultar al descargar: resumen y detalle se generan desde el mismo snapshot.
  const exportAttendees = async () => {
    setExporting(true);
    try {
      await downloadEventAccreditedReport(eventId, data.eventInfo.name);
    } catch {
      showToast.error('No se pudo descargar el Excel de acreditados. Intenta nuevamente.');
    } finally { setExporting(false); }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reportes del evento: {data.eventInfo.name}</h2>
        <button
          onClick={exportAttendees}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={16} /> {exporting ? 'Generando Excel…' : 'Descargar acreditados (Excel)'}
        </button>
      </div>

      <p className="text-xs text-gray-500">Totales por fecha: si una persona asiste a dos fechas, cuenta dos asistencias. {lastUpdated ? `Actualizado: ${formatDateTimeCL(lastUpdated)}` : ''} · Actualización cada 20 segundos.</p>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total registrados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.participantStats.totalRegistered}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {data.participantStats.registered} Participantes, {data.participantStats.registeredGuests} Invitados
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total acreditados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.participantStats.totalAccredited}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {data.participantStats.accredited} Participantes, {data.participantStats.accreditedGuests} Invitados
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Premios entregados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.awardStats.delivered} <span className="text-sm text-gray-400 font-normal">/ {data.awardStats.assigned}</span></h3>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Inscritos por fecha */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg"><CalendarDays className="w-5 h-5 text-indigo-600" /></div>
          <h3 className="text-lg font-semibold text-gray-800">Inscritos y acreditados por fecha</h3>
        </div>
        {data.scheduleStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.scheduleStats.map((s, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                <div className="text-sm font-medium text-gray-800 truncate capitalize">{s.scheduleName} · {fmtDateShort(s.startDateTime)}</div>
                <div className="text-xs text-gray-400 mt-0.5 mb-3">{s.registeredParticipants} particip. · {s.registeredGuests} invitados</div>
                <div className="flex items-end gap-6">
                  <div>
                    <div className="text-2xl font-bold text-indigo-600 leading-none tabular-nums">{s.registered}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">inscritos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 leading-none tabular-nums">{s.accreditedTotal}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">acreditados</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Este evento aún no tiene fechas.</p>
        )}
      </div>

      {/* Preferencias alimenticias */}
      <p className="text-xs text-gray-500">Las preferencias alimenticias se consultan al abrir y se actualizan cada minuto.</p>
      {dietError && <p role="alert" className="text-sm text-amber-700">No se pudieron actualizar las preferencias alimenticias. Se conserva la última consulta y se reintentará automáticamente.</p>}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-50 rounded-lg"><Utensils className="w-5 h-5 text-emerald-600" /></div>
          <h3 className="text-lg font-semibold text-gray-800">Preferencias alimenticias</h3>
          <span className="text-sm text-gray-400">({dietTotal} con preferencia)</span>
          {dietEntries.length > 0 && <span className="text-xs text-gray-400 ml-auto hidden sm:inline">Presiona una para ver quiénes</span>}
        </div>
        {dietEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
            {dietEntries.map(([k, n]) => {
              const isOpen = openDiet === k;
              return (
                <div key={k} className={`bg-emerald-50/60 border rounded-lg overflow-hidden ${isOpen ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-emerald-100'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenDiet(isOpen ? null : k)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-emerald-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700 truncate">{dietaryLabel(k)}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-emerald-700 tabular-nums">{n}</span>
                      <ChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-emerald-100 max-h-44 overflow-auto px-3 py-2 space-y-1 bg-white/70">
                      {(dietPeople[k] || []).map((per, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-gray-700 truncate">{per.name}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                            {per.tipo === 'Invitado' ? `Inv. · ${per.pertenece}` : 'Particip.'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nadie registró una preferencia alimenticia especial{attendees.length ? '.' : ' (o aún no hay asistentes).'}</p>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accreditation Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Línea de tiempo de acreditaciones</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.accreditationTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => value.split(' ')[1]} 
                    stroke="#9CA3AF"
                    fontSize={12}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4F46E5" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    name="Acreditaciones"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asistencia por fecha: inscritos vs acreditados */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Asistencia por fecha</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scheduleChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <YAxis
                    dataKey="label"
                    type="category"
                    width={130}
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickFormatter={(value) => value.length > 22 ? `${value.substring(0, 22)}…` : value}
                />
                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                <Legend />
                <Bar dataKey="Inscritos" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="Acreditados" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Schedule Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Detalle por fecha</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4 text-center">Cupo particip. <span className="normal-case font-normal text-gray-400">/ aforo</span></th>
                <th className="px-6 py-4 text-center">Inscritos <span className="normal-case font-normal text-gray-400">(part. / cupo)</span></th>
                <th className="px-6 py-4 text-center">Acreditados <span className="normal-case font-normal text-gray-400">(part. / cupo)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.scheduleStats.map((schedule, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 capitalize whitespace-nowrap">{fmtDate(schedule.startDateTime)}</td>
                  <td className="px-6 py-4">{schedule.scheduleName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatTimeCL(schedule.startDateTime)} – {formatTimeCL(schedule.endDateTime)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-medium text-gray-800">{schedule.capacity > 0 ? schedule.capacity : 'Ilimitado'}</div>
                    <div className="text-[10px] text-gray-400">aforo {schedule.maxAttendees && schedule.maxAttendees > 0 ? schedule.maxAttendees : '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700" title={`${schedule.registeredParticipants} participantes · ${schedule.registeredGuests} invitados`}>
                      {schedule.registered}
                    </span>
                    {schedule.capacity > 0 && (() => {
                      const pct = (schedule.registeredParticipants / schedule.capacity) * 100;
                      return (
                        <div className="flex items-center justify-center gap-1.5 mt-1.5" title={`${schedule.registeredParticipants} participantes de ${schedule.capacity} de cupo`}>
                          <div className="w-12 bg-gray-200 rounded-full h-1">
                            <div className={`h-1 rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-gray-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title={`${schedule.accreditedParticipants} participantes · ${schedule.accreditedGuests} invitados`}>
                      {schedule.accreditedTotal}
                    </span>
                    {schedule.capacity > 0 && (() => {
                      const pct = (schedule.accreditedParticipants / schedule.capacity) * 100;
                      return (
                        <div className="flex items-center justify-center gap-1.5 mt-1.5" title={`${schedule.accreditedParticipants} participantes de ${schedule.capacity} de cupo`}>
                          <div className="w-12 bg-gray-200 rounded-full h-1">
                            <div className="h-1 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventReport;
