'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { History } from 'lucide-react';

const ENTITY_LABELS: Record<string, string> = {
  Event: 'Evento', Participant: 'Participante', Award: 'Premio', Guest: 'Invitado', EventSchedule: 'Horario',
};
const entityLabel = (e: string) => ENTITY_LABELS[e] || e;
const fmt = (d: string) => { try { return new Date(d).toLocaleString('es-CL'); } catch { return ''; } };

const actionMeta: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'Creación', cls: 'bg-green-50 text-green-700' },
  UPDATE: { label: 'Edición', cls: 'bg-blue-50 text-blue-700' },
  DELETE: { label: 'Eliminación', cls: 'bg-red-50 text-red-600' },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre', description: 'Descripción', location: 'Ubicación', maxCapacity: 'Capacidad',
  allowGuests: 'Permite invitados', maxGuestsPerParticipant: 'Máx. invitados', isPublic: 'Público',
  registrationOpen: 'Inscripción abierta', allowMultipleSchedules: 'Varias fechas', isActive: 'Activo',
  publicSlug: 'Slug', publicTemplate: 'Plantilla', logoUrl: 'Logo', backgroundImageUrl: 'Fondo', emailTemplateId: 'Plantilla correo',
  firstName: 'Nombre', lastName: 'Apellido', email: 'Correo', phone: 'Teléfono',
  documentNumber: 'RUT/Documento', company: 'Empresa', position: 'Cargo', numeroSap: 'Código SAP',
  allowedGuests: 'Invitados permitidos', dietaryPreference: 'Dieta', dietaryComments: 'Comentarios dieta',
  isAwarded: 'Premiado', awardReason: 'Motivo premio',
  guestType: 'Tipo de invitado', relationship: 'Parentesco',
  quantity: 'Cantidad', category: 'Categoría',
  scheduleName: 'Nombre del horario', startDateTime: 'Inicio', endDateTime: 'Término',
  blockType: 'Tipo de bloque', label: 'Etiqueta', imageUrl: 'Imagen',
};
const fieldLabel = (k: string) => FIELD_LABELS[k] || k;
const fmtVal = (v: any) => {
  if (v === null || v === undefined || v === '') return '(vacío)';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return '(actualizado)';
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + '…' : s;
};

const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (entity) params.set('entity', entity);
    const qs = params.toString();
    apiClient.get<any[]>(`/api/audit-logs${qs ? `?${qs}` : ''}`)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [action, entity]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <History className="text-indigo-500" /> Registro de actividad
        </h1>
        <div className="flex items-center gap-2">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Todas las acciones</option>
            <option value="CREATE">Creaciones</option>
            <option value="UPDATE">Ediciones</option>
            <option value="DELETE">Eliminaciones</option>
          </select>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Todo</option>
            <option value="Event">Eventos</option>
            <option value="Participant">Participantes</option>
            <option value="Award">Premios</option>
            <option value="Guest">Invitados</option>
            <option value="EventSchedule">Horarios</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-500">Quién creó, editó o eliminó qué, cuándo y por qué. (Últimos 200 registros)</p>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Elemento</th>
                <th className="px-4 py-2">Motivo / detalle</th>
                <th className="px-4 py-2">Por</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const d = l.details || {};
                const u = l.User || {};
                const am = actionMeta[l.action] || { label: l.action, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={l.id} className="border-t hover:bg-gray-50 align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${am.cls}`}>{am.label}</span>
                    </td>
                    <td className="px-4 py-2">{entityLabel(l.entity)}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{d.name || l.entityId}</span>
                      {d.email && <span className="block text-xs text-gray-500">{d.email}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-sm">
                      {l.action === 'DELETE' ? (
                        d.reason || '—'
                      ) : l.action === 'UPDATE' && d.changes && Object.keys(d.changes).length ? (
                        <ul className="space-y-0.5">
                          {Object.entries<any>(d.changes).map(([k, v]) => (
                            <li key={k} className="text-xs">
                              <span className="font-medium text-gray-800">{fieldLabel(k)}:</span>{' '}
                              <span className="text-gray-400 line-through">{fmtVal(v.from)}</span>{' '}
                              <span className="text-gray-400">→</span>{' '}
                              <span className="text-gray-900">{fmtVal(v.to)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (d.summary || '—')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '—'}
                      {u.email && <span className="block text-xs text-gray-500">{u.email}</span>}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No hay actividad registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogView;
