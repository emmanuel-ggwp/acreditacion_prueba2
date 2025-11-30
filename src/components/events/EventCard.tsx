'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Users, CheckSquare, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import Event from '@/models/Event';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import useEventStore from '@/store/eventStore';
import { formatCapacity } from '@/utils/formatters';

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
  const eventDate = event.createdAt ? format(new Date(event.createdAt), 'PPP') : 'Date not set';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{event.name}</h3>
          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
            <div className="flex items-center space-x-2">
              <Link href={`/events/${event.id}/edit`}>
                <button className="p-1 text-gray-500 hover:text-indigo-600">
                  <Edit size={18} />
                </button>
              </Link>
              <button onClick={handleDelete} className="p-1 text-gray-500 hover:text-red-600">
                <Trash2 size={18} />
              </button>
            </div>
          </RoleGuard>
        </div>
        <p className="text-gray-600 text-sm mb-4">{event.description}</p>

        <div className="space-y-3 text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <CalendarIcon size={16} className="mr-2" />
            <span>{eventDate}</span>
          </div>
          <div className="flex items-center">
            <MapPin size={16} className="mr-2" />
            <span>{event.location || 'Location not specified'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <p className="font-semibold text-lg text-gray-700">{event.participantCount || 0}</p>
            <p className="text-xs text-gray-500">Participants</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-gray-700">{event.accreditedCount || 0}</p>
            <p className="text-xs text-gray-500">Accredited</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-gray-700">
              {formatCapacity(event.accreditedCount || 0, event.maxCapacity)}
            </p>
            <p className="text-xs text-gray-500">Capacity</p>
          </div>
        </div>
        
        <Link href={`/events/${event.id}`}>
          <button className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
