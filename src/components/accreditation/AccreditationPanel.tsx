'use client';

import React, { useState, useEffect } from 'react';
import useEventStore from '@/store/eventStore';
import useAccreditationStore from '@/store/accreditationStore';
import EventSchedule from '@/models/EventSchedule';
import SearchParticipant from './SearchParticipant';
import ParticipantCard from './ParticipantCard';
import RecentAccreditations from './RecentAccreditations';
import CapacityIndicator from './CapacityIndicator';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';

const AccreditationPanel = () => {
  const { events, fetchEvents, schedules, fetchSchedulesForEvent } = useEventStore();
  const { lastAccreditation, getAccreditationStats, totalAccreditations, accreditationsToday } = useAccreditationStore();
  
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<{ type: 'participant' | 'guest', data: Participant | Guest } | null>(null);

  useEffect(() => {
    fetchEvents(1, 100); // Fetch all events
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchSchedulesForEvent(selectedEventId);
      getAccreditationStats(selectedEventId);
    }
  }, [selectedEventId, fetchSchedulesForEvent, getAccreditationStats]);

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    setSelectedEventId(eventId);
    setSelectedScheduleId('');
    setSelectedPerson(null);
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedScheduleId(e.target.value);
    setSelectedPerson(null);
  };

  const handlePersonSelect = (person: { type: 'participant' | 'guest', data: Participant | Guest }) => {
    setSelectedPerson(person);
  };

  const selectedSchedule = schedules.find((s: EventSchedule) => s.id === selectedScheduleId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 bg-gray-50 min-h-screen">
      {/* Main Accreditation Column */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Accreditation</h1>
        
        {/* Event and Schedule Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="event-select" className="block text-sm font-medium text-gray-700">Event</label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={handleEventChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select an Event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="schedule-select" className="block text-sm font-medium text-gray-700">Schedule</label>
            <select
              id="schedule-select"
              value={selectedScheduleId}
              onChange={handleScheduleChange}
              disabled={!selectedEventId}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select a Schedule</option>
              {schedules.map(schedule => (
                <option key={schedule.id} value={schedule.id}>{schedule.scheduleName}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedScheduleId && (
          <>
            <SearchParticipant 
              eventId={selectedEventId} 
              onSelect={handlePersonSelect} 
            />
            
            {selectedPerson && (
              <ParticipantCard 
                person={selectedPerson.data}
                type={selectedPerson.type}
                scheduleId={selectedScheduleId}
              />
            )}
          </>
        )}
      </div>

      {/* Side Column */}
      <div className="space-y-8">
        {selectedSchedule && (
          <CapacityIndicator 
            schedule={selectedSchedule}
          />
        )}
        <RecentAccreditations eventId={selectedEventId} />
      </div>
    </div>
  );
};

export default AccreditationPanel;
