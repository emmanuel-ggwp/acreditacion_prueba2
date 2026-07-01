'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { dietaryLabel } from '@/utils/dietary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Award, CheckCircle, Percent, Download, Utensils } from 'lucide-react';
import { utils, writeFile } from 'xlsx';


interface EventReportProps {
  eventId: string;
}

interface ReportData {
  eventInfo: any;
  participantStats: {
    registered: number;
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

const EventReport: React.FC<EventReportProps> = ({ eventId }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const reportData = await apiClient.get<ReportData>(`/api/reports/events/${eventId}`);
        setData(reportData);
        try {
          const att = await apiClient.get<any[]>(`/api/events/${eventId}/export`);
          setAttendees(Array.isArray(att) ? att : []);
        } catch { /* la dieta/exportación es opcional; no bloquea el reporte */ }
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los reportes del evento');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchReport();
    }
  }, [eventId]);

  if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center">No hay datos disponibles</div>;

  // Resumen de preferencias alimenticias (participantes + invitados), excluyendo "Ninguna".
  const dietCounts: Record<string, number> = {};
  let dietTotal = 0;
  for (const p of attendees) {
    const add = (v: any) => { if (v && v !== 'NONE') { dietCounts[v] = (dietCounts[v] || 0) + 1; dietTotal++; } };
    add(p?.dietaryPreference);
    for (const g of (p?.guests || [])) add(g?.dietaryPreference);
  }
  const dietEntries = Object.entries(dietCounts).sort((a, b) => b[1] - a[1]);

  // Exportar a Excel: una fila por persona (participante e invitado), con su preferencia alimenticia.
  const exportAttendees = () => {
    const rows: any[] = [];
    for (const p of attendees) {
      rows.push({
        Tipo: 'Participante', Nombre: p.firstName || '', Apellido: p.lastName || '',
        'RUT/Documento': p.documentNumber || '', Empresa: p.company || '', Cargo: p.position || '',
        'Código SAP': p.numeroSap || '', 'Preferencia alimenticia': dietaryLabel(p.dietaryPreference),
        Acreditado: p.isAccredited ? 'Sí' : 'No', 'Pertenece a': '',
      });
      for (const g of (p.guests || [])) {
        rows.push({
          Tipo: 'Invitado', Nombre: g.firstName || '', Apellido: g.lastName || '',
          'RUT/Documento': g.documentNumber || '', Empresa: '', Cargo: '',
          'Código SAP': '', 'Preferencia alimenticia': dietaryLabel(g.dietaryPreference),
          Acreditado: '', 'Pertenece a': `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        });
      }
    }
    if (!rows.length) return;
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Asistentes');
    writeFile(wb, `Asistentes_${(data?.eventInfo?.name || eventId).toString().replace(/[^a-z0-9]+/gi, '_')}.xlsx`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reportes del evento: {data.eventInfo.name}</h2>
        <button
          onClick={exportAttendees}
          disabled={!attendees.length}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={16} /> Exportar asistentes (Excel)
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total registrados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.participantStats.registered}</h3>
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
              <p className="text-sm font-medium text-gray-500">Tasa de asistencia</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.participantStats.attendanceRate.toFixed(1)}%</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Premios entregados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.awardStats.delivered} <span className="text-sm text-gray-400 font-normal">/ {data.awardStats.assigned}</span></h3>
              <p className="text-xs text-gray-500 mt-1">
                {data.awardStats.deliveryRate.toFixed(1)}% Tasa de entrega
              </p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Preferencias alimenticias */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-50 rounded-lg"><Utensils className="w-5 h-5 text-emerald-600" /></div>
          <h3 className="text-lg font-semibold text-gray-800">Preferencias alimenticias</h3>
          <span className="text-sm text-gray-400">({dietTotal} con preferencia)</span>
        </div>
        {dietEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dietEntries.map(([k, n]) => (
              <div key={k} className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{dietaryLabel(k)}</span>
                <span className="text-sm font-bold text-emerald-700">{n}</span>
              </div>
            ))}
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

        {/* Schedule Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Asistencia por horario</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scheduleStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis 
                    dataKey="scheduleName" 
                    type="category" 
                    width={100} 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                <Legend />
                <Bar dataKey="accreditedTotal" name="Acreditados" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="capacity" name="Capacidad" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Schedule Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Detalles del horario</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
              <tr>
                <th className="px-6 py-4">Nombre del horario</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4 text-center">Capacidad</th>
                <th className="px-6 py-4 text-center">Acreditados</th>
                <th className="px-6 py-4 text-center">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.scheduleStats.map((schedule, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{schedule.scheduleName}</td>
                  <td className="px-6 py-4">
                    {new Date(schedule.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(schedule.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-center">{schedule.capacity > 0 ? schedule.capacity : 'Ilimitado'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {schedule.accreditedTotal}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                                className={`h-1.5 rounded-full ${schedule.capacityUsedPercentage > 90 ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(schedule.capacityUsedPercentage, 100)}%` }}
                            ></div>
                        </div>
                        <span className="text-xs">{schedule.capacityUsedPercentage.toFixed(0)}%</span>
                    </div>
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
