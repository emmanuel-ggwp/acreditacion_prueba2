'use client';

import React, { useState } from 'react';
import useEventStore from '@/store/eventStore';
import { Calendar, Clock, Users, Award, BarChart2 } from 'lucide-react';
import ScheduleList from '@/components/events/ScheduleList';
// Placeholders for other components
const ParticipantsTab = () => <div>Participants Management</div>;
const AwardsTab = () => <div>Awards Management</div>;
const ReportsTab = () => <div>Event Reports</div>;

interface EventDetailsProps {
  eventId: string;
}

type Tab = 'info' | 'schedules' | 'participants' | 'awards' | 'reports';

const EventDetails: React.FC<EventDetailsProps> = ({ eventId }) => {
  const { currentEvent, fetchEventById, loading } = useEventStore();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  React.useEffect(() => {
    fetchEventById(eventId);
  }, [eventId, fetchEventById]);

  if (loading && !currentEvent) {
    return <div className="text-center p-10">Loading event details...</div>;
  }

  if (!currentEvent) {
    return <div className="text-center p-10 text-red-500">Event not found.</div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Info', icon: Calendar },
    { id: 'schedules', label: 'Schedules', icon: Clock },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'awards', label: 'Awards', icon: Award },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold">Event Information</h3>
            <p className="mt-2 text-gray-600">{currentEvent.description}</p>
            {/* Add more details here */}
          </div>
        );
      case 'schedules':
        return <ScheduleList eventId={eventId} />;
      case 'participants':
        return <ParticipantsTab />;
      case 'awards':
        return <AwardsTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">{currentEvent.name}</h1>
      <p className="text-gray-500 mb-6">{currentEvent.location}</p>

      <div className="flex border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center py-3 px-4 text-sm font-medium ${
              activeTab === id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={18} className="mr-2" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EventDetails;
