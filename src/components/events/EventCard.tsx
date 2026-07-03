'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Trash2, Edit, ArrowRight, MoreVertical, Globe, Lock, Unlock, Ban, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Event from '@/models/Event';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import useEventStore from '@/store/eventStore';
import { formatCapacity, formatEventDate } from '@/utils/formatters';
import { EventStatusBadge } from './EventStatusBadge';
import toast from 'react-hot-toast';
import { ButtonEventReport } from '@/components/events/ButtonEventReport';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';

interface EventCardProps {
  event: Event & { participantCount?: number; accreditedCount?: number };
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const deleteEvent = useEventStore((state) => state.deleteEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Estado de publicación / inscripción del evento
  const isPublic = (event as any).isPublic as boolean;
  const registrationOpen = (event as any).registrationOpen !== false;
  const isActive = (event as any).isActive !== false;
  const publicSlug = (event as any).publicSlug as string | null;

  const openDelete = () => { setMenuOpen(false); setShowDeleteModal(true); };
  const confirmDelete = async (reason: string) => {
    try {
      await deleteEvent(event.id, reason);
      toast.success('Evento eliminado');
      setShowDeleteModal(false);
    } catch {
      toast.error('No se pudo eliminar el evento');
    }
  };

  const runUpdate = async (data: Record<string, any>, successMsg: string, confirmMsg?: string) => {
    setMenuOpen(false);
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await updateEvent(event.id, data);
      toast.success(successMsg);
    } catch (error) {
      toast.error('No se pudo actualizar el evento');
      console.error(error);
    }
  };

  // Etiqueta de estado de inscripción/publicación
  const stateBadge = !isActive
    ? { text: 'Cancelado', cls: 'bg-red-100 text-red-700' }
    : !isPublic
      ? { text: 'Borrador', cls: 'bg-gray-100 text-gray-600' }
      : registrationOpen
        ? { text: 'Inscripción abierta', cls: 'bg-green-100 text-green-700' }
        : { text: 'Inscripción cerrada', cls: 'bg-amber-100 text-amber-700' };

  const startDate = event.schedules?.[0]?.startDateTime;
  const endDate = event.schedules?.[0]?.endDateTime;

  const eventDate = startDate && endDate
    ? formatEventDate(startDate, endDate)
    : 'Fecha no especificada';

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <EventStatusBadge startDate={startDate} endDate={endDate} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stateBadge.cls}`}>
                {stateBadge.text}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {event.name}
            </h3>
          </div>
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <div className="flex items-center space-x-1">
              <ButtonEventReport eventId={event.id} eventName={event.name} />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Acciones"
                >
                  <MoreVertical size={18} />
                </button>

                {menuOpen && (
                  <>
                    {/* Overlay para cerrar al hacer clic fuera */}
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black/5 z-20 py-1 text-sm">
                      <Link href={`/events/${event.id}`}>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          <Edit size={15} /> Editar
                        </button>
                      </Link>

                      {!isPublic ? (
                        <button onClick={() => runUpdate({ isPublic: true }, 'Evento publicado')} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          <Globe size={15} /> Publicar
                        </button>
                      ) : (
                        <button onClick={() => runUpdate({ isPublic: false }, 'Evento despublicado')} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          <Globe size={15} /> Despublicar
                        </button>
                      )}

                      {isPublic && (
                        registrationOpen ? (
                          <button onClick={() => runUpdate({ registrationOpen: false }, 'Inscripción cerrada')} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                            <Lock size={15} /> Cerrar inscripción
                          </button>
                        ) : (
                          <button onClick={() => runUpdate({ registrationOpen: true }, 'Inscripción abierta')} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                            <Unlock size={15} /> Abrir inscripción
                          </button>
                        )
                      )}

                      {isPublic && publicSlug && (
                        <a href={`/public/events/${publicSlug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          <ExternalLink size={15} /> Ver landing
                        </a>
                      )}

                      <div className="my-1 border-t border-gray-100" />

                      {isActive ? (
                        <button onClick={() => runUpdate({ isActive: false }, 'Evento cancelado', '¿Cancelar este evento? Dejará de aparecer públicamente.')} className="w-full flex items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50">
                          <Ban size={15} /> Cancelar evento
                        </button>
                      ) : (
                        <button onClick={() => runUpdate({ isActive: true }, 'Evento reactivado')} className="w-full flex items-center gap-2 px-3 py-2 text-green-700 hover:bg-green-50">
                          <RotateCcw size={15} /> Reactivar evento
                        </button>
                      )}

                      <button onClick={openDelete} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50">
                        <Trash2 size={15} /> Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </RoleGuard>
        </div>

        <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">{event.description}</p>

        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <div className="flex items-center">
            <CalendarIcon size={16} className="mr-2.5 text-gray-400" />
            <span>{eventDate}</span>
          </div>
          <div className="flex items-center">
            <MapPin size={16} className="mr-2.5 text-gray-400" />
            <span className="truncate">{event.location || 'Ubicación no especificada'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-4 border-t border-gray-100 bg-gray-50/50 -mx-6 px-6">
          <div className="text-center">
            <p className="font-semibold text-gray-900">{event.participantCount || 0}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">Total</p>
          </div>
          <div className="text-center border-l border-gray-200">
            <p className="font-semibold text-indigo-600">{event.accreditedCount || 0}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">Check-in</p>
          </div>
          <div className="text-center border-l border-gray-200">
            <p className="font-semibold text-gray-900">
              {formatCapacity(event.accreditedCount || 0, event.maxCapacity)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">Cap</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <Link href={`/events/${event.id}`} className="block">
          <button className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200 text-sm font-medium flex items-center justify-center group-hover:border-indigo-300">
            Ver Detalles
            <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </button>
        </Link>
      </div>

      {showDeleteModal && (
        <DeleteReasonModal
          title="Eliminar evento"
          itemName={event.name}
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default EventCard;
