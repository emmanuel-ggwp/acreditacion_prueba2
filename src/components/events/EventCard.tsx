'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Users, CheckSquare, Trash2, Edit, ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import Event from '@/models/Event';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import useEventStore from '@/store/eventStore';
import { formatCapacity, formatEventDate } from '@/utils/formatters';
import { EventStatusBadge } from './EventStatusBadge';
import toast from 'react-hot-toast';
import { ButtonEventReport } from '@/components/events/ButtonEventReport';

interface EventCardProps {
  event: Event & { participantCount?: number; accreditedCount?: number };
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const deleteEvent = useEventStore((state) => state.deleteEvent);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(event.id);
    }
  };

  // Assuming event dates are stored in schedules. For simplicity, we'll show created date.
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
            <div className="mb-2">
              <EventStatusBadge startDate={startDate} endDate={endDate} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {event.name}
            </h3>
          </div>
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ButtonEventReport eventId={event.id} eventName={event.name} />
              <Link href={`/events/${event.id}`}>
                <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                  <Edit size={16} />
                </button>
              </Link>
              <button 
                onClick={handleDelete} 
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={16} />
              </button>
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
            <span className="truncate">{event.location || 'Location not specified'}</span>
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
            View Details
            <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
