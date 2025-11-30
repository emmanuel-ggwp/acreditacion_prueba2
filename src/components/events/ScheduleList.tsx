'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Clock, Users } from 'lucide-react';
import EventSchedule from '@/models/EventSchedule';
import ScheduleForm from '@/components/events/ScheduleForm';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';

interface ScheduleListProps {
  eventId: string;
}

// Mock data for now
const mockSchedules: EventSchedule[] = [
  // Add mock schedule objects here if needed for UI development
];

const ScheduleList: React.FC<ScheduleListProps> = ({ eventId }) => {
  const [schedules, setSchedules] = useState<EventSchedule[]>(mockSchedules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EventSchedule | null>(null);

  // TODO: Replace with store integration
  // const { schedules, fetchSchedules, deleteSchedule } = useScheduleStore();
  // useEffect(() => { fetchSchedules(eventId); }, [eventId, fetchSchedules]);

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
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <div key={schedule.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">{schedule.scheduleName}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock size={14} className="mr-2" />
                  <span>
                    {format(new Date(schedule.startDateTime), 'p')} - {format(new Date(schedule.endDateTime), 'p')}
                  </span>
                  <span className="mx-2">|</span>
                  <Users size={14} className="mr-1" />
                  <span>{schedule.maxCapacity || 'Unlimited'} capacity</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                  <button onClick={() => handleEdit(schedule)} className="p-2 text-gray-500 hover:text-indigo-600">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(schedule.id)} className="p-2 text-gray-500 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </RoleGuard>
                <button className="text-sm text-indigo-600 hover:underline">View Accredited</button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No schedules have been created for this event yet.</p>
        )}
      </div>
    </div>
  );
};

export default ScheduleList;
