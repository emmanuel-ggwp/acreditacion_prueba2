'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Clock, Users } from 'lucide-react';
import EventSchedule from '@/models/EventSchedule';
import ScheduleForm from '@/components/events/ScheduleForm';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import useEventStore from '@/store/eventStore';

interface ScheduleListProps {
  eventId: string;
}

// Mock data for now
const mockSchedules: EventSchedule[] = [
  // Add mock schedule objects here if needed for UI development
];

const ScheduleList: React.FC<ScheduleListProps> = ({ eventId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EventSchedule | null>(null);

  const { EventSchedules, fetchSchedulesForEvent, deleteSchedule } = useEventStore();
  useEffect(() => { fetchSchedulesForEvent(eventId); }, [eventId, fetchSchedulesForEvent]);

  const handleEdit = (schedule: EventSchedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      // deleteSchedule(scheduleId);
      console.log('Deleting schedule', scheduleId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event Schedules</h3>
        <RoleGuard allowedRoles={[ROLES.ADMIN]}>
          <button
            onClick={() => { setEditingSchedule(null); setIsFormOpen(true); }}
            className="flex items-center bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-200"
          >
            <Plus size={16} className="mr-1" />
            New Schedule
          </button>
        </RoleGuard>
      </div>

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
                <h4 className="text-lg font-semibold text-gray-900">{schedule.scheduleName}</h4>
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
                    <span>{schedule.maxCapacity ? `${schedule.maxCapacity} capacity` : 'Unlimited capacity'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                  <button 
                    onClick={() => handleEdit(schedule)} 
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Edit Schedule"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(schedule.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Schedule"
                  >
                    <Trash2 size={18} />
                  </button>
                </RoleGuard>
                <button className="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                  View Accredited
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new schedule for this event.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleList;
