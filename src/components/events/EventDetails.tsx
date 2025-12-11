'use client';

import React, { useState, useEffect } from 'react';
import useEventStore from '@/store/eventStore';
import { Calendar, Clock, Users, Award, BarChart2, Edit2, X, UserCheck, FileText } from 'lucide-react';
import ScheduleList from '@/components/events/ScheduleList';
import ParticipantList from '@/components/participants/ParticipantList';
import AccreditationPanel from '@/components/accreditation/AccreditationPanel';
import EventReport from '@/components/reports/EventReport';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { isToday, isYesterday, isTomorrow } from 'date-fns';
import apiClient from '@/utils/apiClient';
import EventForm from './EventForm';

// Placeholders for other components
const AwardsTab = () => <div>Awards Management</div>;

interface EventDetailsProps {
  eventId?: string;
}

type Tab = 'info' | 'schedules' | 'participants' | 'awards' | 'reports' | 'accreditation';

const EventDetails: React.FC<EventDetailsProps> = ({ eventId }) => {
  const router = useRouter();
  const { currentEvent, fetchEventById, loading, EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditMode, setIsEditMode] = useState(!eventId);

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId);
      fetchSchedulesForEvent(eventId);
    } else {
      setIsEditMode(true);
    }
  }, [eventId, fetchEventById, fetchSchedulesForEvent]);

  const handleDownloadReport = async () => {
    if (!eventId || !currentEvent) return;
    try {
        const response = await apiClient.get(`/api/reports/events/${eventId}?type=general`, {
            responseType: 'blob'
        });
        
        // Create a blob from the response
        const blob = new Blob([response as any], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_report_${currentEvent.name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
    } catch (error) {
        console.error('Error downloading report:', error);
        toast.error('Failed to download report');
    }
  };

  const hasActiveSchedule = React.useMemo(() => {
    return EventSchedules.some(schedule => {
      const date = new Date(schedule.startDateTime);
      return isToday(date) || isYesterday(date) || isTomorrow(date);
    });
  }, [EventSchedules]);

  if (loading && eventId && !currentEvent) {
    return <div className="text-center p-10">Loading event details...</div>;
  }

  if (eventId && !currentEvent && !loading) {
    return <div className="text-center p-10 text-red-500">Event not found.</div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Info', icon: Calendar },
    { id: 'schedules', label: 'Schedules', icon: Clock },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'awards', label: 'Awards', icon: Award },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  if (hasActiveSchedule) {
    tabs.push({ id: 'accreditation', label: 'Accreditation', icon: UserCheck });
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Event Information</h3>
              {eventId && (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-50 text-green-700 hover:bg-green-100"
                    title="Download General Report"
                  >
                    <FileText size={16} className="mr-2"/> Report
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    <Edit2 size={16} className="mr-2"/> Edit Details
                  </button>
                </div>
              )}
            </div>
            
            {currentEvent && (
              <div className="space-y-8 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-lg text-gray-900 font-medium">{currentEvent.name}</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{currentEvent.description || <span className="text-gray-400 italic">No description provided</span>}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900 flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>{currentEvent.location || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                    <p className="text-gray-900">{currentEvent.maxCapacity ? `${currentEvent.maxCapacity} attendees` : 'Unlimited capacity'}</p>
                  </div>

                  <div className="flex items-center h-full pt-6">
                      <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 w-fit">
                        <span className={`h-2.5 w-2.5 rounded-full mr-2 ${currentEvent.allowGuests ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm font-medium text-gray-700">Guests {currentEvent.allowGuests ? 'Allowed' : 'Not Allowed'}</span>
                      </div>
                  </div>

                  {currentEvent.allowGuests && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests per Participant</label>
                      <p className="text-gray-900">{currentEvent.maxGuestsPerParticipant}</p>
                    </div>
                  )}

                  {currentEvent.isPublic && (
                    <div className="col-span-2 border-t border-gray-100 pt-6 mt-2">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Public Registration</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Public URL:</p>
                            <a 
                                href={`/public/events/${currentEvent.publicSlug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 font-medium break-all"
                            >
                                {`${window.location.origin}/public/events/${currentEvent.publicSlug}`}
                            </a>
                            <p className="text-xs text-gray-500 mt-2">Template: {currentEvent.publicTemplate || 'Default'}</p>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isEditMode && (
                <EventForm 
                    event={currentEvent || undefined} 
                    onClose={() => {
                        if (!eventId) {
                            router.back();
                        } else {
                            setIsEditMode(false);
                        }
                    }}
                    onSuccess={(newEvent) => {
                        if (!eventId && newEvent.id) {
                            router.push(`/events/${newEvent.id}`);
                        }
                        setIsEditMode(false);
                    }}
                />
            )}
          </div>
        );
      case 'schedules':
        return eventId ? <ScheduleList eventId={eventId} /> : <div className="p-6 text-center text-gray-500">Save the event to manage schedules.</div>;
      case 'participants':
        return eventId ? <ParticipantList eventId={eventId} /> : <div className="p-6 text-center text-gray-500">Save the event to manage participants.</div>;
      case 'awards':
        return eventId ? <AwardsTab /> : <div className="p-6 text-center text-gray-500">Save the event to manage awards.</div>;
      case 'reports':
        return eventId ? <EventReport eventId={eventId} /> : <div className="p-6 text-center text-gray-500">Save the event to view reports.</div>;
      case 'accreditation':
        return eventId ? <AccreditationPanel eventId={eventId} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {eventId ? currentEvent?.name : 'New Event'}
        </h1>
        <p className="text-gray-600">
          {eventId ? currentEvent?.location : 'Create a new event'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center py-4 px-6 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white -mb-px'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} className="mr-2" />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;