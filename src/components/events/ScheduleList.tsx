'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Clock, Users, MapPin, DoorOpen, DoorClosed } from 'lucide-react';
import EventSchedule from '@/models/EventSchedule';
import ScheduleForm from '@/components/events/ScheduleForm';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import useEventStore from '@/store/eventStore';
import toast from 'react-hot-toast';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';
import ScheduleImageManager from '@/components/events/ScheduleImageManager';

interface ScheduleListProps {
  eventId: string;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ eventId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EventSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventSchedule | null>(null);

  const { EventSchedules, fetchSchedulesForEvent, deleteSchedule, setScheduleStatus } = useEventStore();
  useEffect(() => { fetchSchedulesForEvent(eventId); }, [eventId, fetchSchedulesForEvent]);

  const STATUS: Record<string, { label: string; cls: string }> = {
    accrediting: { label: 'En acreditación', cls: 'bg-green-100 text-green-700' },
    published: { label: 'Programado', cls: 'bg-blue-100 text-blue-700' },
    accredited: { label: 'Cerrado', cls: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  };

  const handleToggleStatus = async (schedule: EventSchedule, status: string) => {
    try {
      await setScheduleStatus(schedule.id, eventId, status);
      toast.success(status === 'accrediting' ? 'Acreditación abierta' : 'Acreditación cerrada');
    } catch {
      toast.error('No se pudo cambiar el estado del horario');
    }
  };

  const handleEdit = (schedule: EventSchedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    const s = (EventSchedules as any[]).find((x) => x.id === scheduleId) || null;
    setDeleteTarget(s);
  };

  const confirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule(deleteTarget.id, eventId, reason);
      setDeleteTarget(null);
      toast.success('Horario eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el horario');
      console.error(error);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Horarios del Evento</h3>
        <RoleGuard allowedRoles={[ROLES.ADMIN]}>
          <button
            onClick={() => { setEditingSchedule(null); setIsFormOpen(true); }}
            className="flex items-center bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-200"
          >
            <Plus size={16} className="mr-1" />
            Nuevo Horario
          </button>
        </RoleGuard>
      </div>

      <ScheduleImageManager eventId={eventId} />

      {isFormOpen && (
        <div className="mb-6">
          <ScheduleForm
            eventId={eventId}
            schedule={editingSchedule}
            onClose={handleFormClose}
          />
        </div>
      )}

      <div className="space-y-4">
        {EventSchedules?.length > 0 ? (
          EventSchedules.map((schedule: EventSchedule) => (
            <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-semibold text-gray-900">{schedule.scheduleName}</h4>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${(STATUS[(schedule as any).status] || STATUS.published).cls}`}>
                    {(STATUS[(schedule as any).status] || STATUS.published).label}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                  <div className="flex items-center">
                    <Clock size={16} className="mr-1.5 text-indigo-500" />
                    <span>
                      {format(new Date(schedule.startDateTime), 'p')} - {format(new Date(schedule.endDateTime), 'p')}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center">
                    <Users size={16} className="mr-1.5 text-indigo-500" />
                    <span>{schedule.displayMaxCapacity ? `${schedule.displayMaxCapacity} de capacidad` : 'Capacidad ilimitada'}</span>
                  </div>
                  {(schedule.displayLocation || schedule.location) && (
                    <>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-1.5 text-indigo-500" />
                        <span>{schedule.displayLocation || schedule.location}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                  {(schedule as any).status === 'accrediting' ? (
                    <button
                      onClick={() => handleToggleStatus(schedule, 'accredited')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      title="Cerrar acreditación"
                    >
                      <DoorClosed size={16} /> Cerrar
                    </button>
                  ) : (schedule as any).status !== 'cancelled' && (
                    <button
                      onClick={() => handleToggleStatus(schedule, 'accrediting')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                      title="Abrir acreditación"
                    >
                      <DoorOpen size={16} /> Abrir
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Editar Horario"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(schedule.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Eliminar Horario"
                  >
                    <Trash2 size={18} />
                  </button>
                </RoleGuard>
                <button className="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                  Ver Acreditados
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin horarios</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando un nuevo horario para este evento.</p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteReasonModal
          title="Eliminar horario"
          itemName={(deleteTarget as any).label || deleteTarget.scheduleName}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ScheduleList;
