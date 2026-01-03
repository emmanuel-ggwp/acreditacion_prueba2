'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useEventStore from '@/store/eventStore';
import useAccreditationStore from '@/store/accreditationStore';
import EventSchedule from '@/models/EventSchedule';
import SearchParticipant from './SearchParticipant';
import ParticipantCard from './ParticipantCard';
import RecentAccreditations from './RecentAccreditations';
import CapacityIndicator from './CapacityIndicator';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';

interface AccreditationPanelProps {
  eventId?: string;
  scheduleId?: string;
}

const AccreditationPanel = ({ eventId, scheduleId }: AccreditationPanelProps) => {
  const { searchedSchedules, searchSchedules, EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const { lastAccreditation, getAccreditationStats, totalAccreditations, accreditationsToday } = useAccreditationStore();
  
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(scheduleId || '');
  const [selectedPerson, setSelectedPerson] = useState<{ type: 'participant' | 'guest', data: Participant | Guest } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchAll, setSearchAll] = useState(false);

  useEffect(() => {
    if (eventId) setSelectedEventId(eventId);
    if (scheduleId) setSelectedScheduleId(scheduleId);
  }, [eventId, scheduleId]);

  useEffect(() => {
    searchSchedules('', searchAll); // Fetch default schedules (yesterday, today, tomorrow)
  }, [searchSchedules, searchAll]);

  useEffect(() => {
    if (selectedEventId) {
      fetchSchedulesForEvent(selectedEventId);
      getAccreditationStats(selectedEventId);
    }
  }, [selectedEventId, fetchSchedulesForEvent, getAccreditationStats]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!eventId) {
      searchSchedules(value, searchAll);
    }
    setShowDropdown(true);
  };

  const handleSearchAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSearchAll(checked);
    if (!eventId) {
      searchSchedules(searchTerm, checked);
    }
  };

  const filteredSchedules = useMemo(() => {
    if (eventId) {
      if (!searchTerm) return EventSchedules;
      return EventSchedules.filter(s => s.scheduleName.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return searchedSchedules;
  }, [eventId, EventSchedules, searchedSchedules, searchTerm]);

  const handleScheduleSelect = (schedule: EventSchedule) => {
    setSelectedScheduleId(schedule.id);
    setSelectedEventId(schedule.eventId);
    setSearchTerm(schedule.scheduleName);
    setShowDropdown(false);
    setSelectedPerson(null);
  };

  useEffect(() => {
    console.log('Fasdsadasd');
    const timer = setTimeout(() => {
      const schedule = filteredSchedules.find(s => s.status === 'accrediting') || filteredSchedules[0];
      console.log('Auto-selecting schedule:', schedule.id, selectedScheduleId);
      if (selectedScheduleId !== schedule.id) {
        handleScheduleSelect(schedule);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredSchedules, selectedScheduleId]);

  const handlePersonSelect = (person: { type: 'participant' | 'guest', data: Participant | Guest }) => {
    setSelectedPerson(person);
  };

  const selectedSchedule = EventSchedules.find((s: EventSchedule) => s.id === selectedScheduleId) || searchedSchedules.find((s: EventSchedule) => s.id === selectedScheduleId);

  console.log('Selected Schedule:', selectedSchedule, selectedScheduleId, 'a');
  useEffect(() => {
    if (selectedSchedule && !searchTerm) {
      setSearchTerm(selectedSchedule.scheduleName);
    }
  }, [selectedSchedule, searchTerm]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 bg-gray-50 min-h-screen">
      {/* Main Accreditation Column */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Accreditation</h1>
        
        {/* Schedule Search Input */}
        <div className="mb-6 relative">
          <label htmlFor="schedule-search" className="block text-sm font-medium text-gray-700">Search Schedule</label>
          <div className="flex items-center gap-4">
            <div className="relative flex-grow">
                <input
                    id="schedule-search"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => {
                        if (!searchTerm) searchSchedules('', searchAll);
                        setShowDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Type to search schedules..."
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                />
                {showDropdown && filteredSchedules.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {filteredSchedules.map((schedule) => (
                        <div
                        key={schedule.id}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white border-b last:border-b-0"
                        onClick={() => handleScheduleSelect(schedule)}
                        >
                        <span className="block truncate font-medium">{schedule.scheduleName} </span>
                        <span className="block truncate text-xs text-gray-500 hover:text-gray-200">
                            {new Date(schedule.startDateTime).toLocaleDateString()} - {(schedule as any).Event?.name}
                        </span>
                        </div>
                    ))}
                    </div>
                )}
            </div>
            {!eventId && (
              <div className="flex items-center mt-1">
                  <input
                      id="search-all-checkbox"
                      type="checkbox"
                      checked={searchAll}
                      onChange={handleSearchAllChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="search-all-checkbox" className="ml-2 block text-sm text-gray-900">
                      Search all events
                  </label>
              </div>
            )}
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
