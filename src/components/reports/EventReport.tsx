'use client';

import React, { useState } from 'react';
import { ChevronDown, FileText, BarChart2, Award as AwardIcon } from 'lucide-react';
import AttendanceTable from './AttendanceTable';
import AwardsSummary from './AwardsSummary';
import ChartAccreditations from './ChartAccreditations';
import ExportButton from './ExportButton';

// Mock Data
const eventInfo = {
  name: 'Annual Tech Summit 2025',
  date: 'November 29-30, 2025',
  location: 'Grand Convention Center',
};

const globalStats = {
  totalParticipants: 1200,
  accredited: 950,
  pending: 250,
  accreditationRate: '79.17%',
  peakHour: '11:00 AM',
};

const CollapsibleSection = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 font-semibold text-lg"
      >
        <div className="flex items-center">
          <Icon className="mr-3 text-indigo-600" size={22} />
          <span>{title}</span>
        </div>
        <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
};

const EventReport: React.FC<{ eventId: string }> = ({ eventId }) => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{eventInfo.name}</h1>
          <p className="text-gray-500">{eventInfo.date} - {eventInfo.location}</p>
        </div>
        <ExportButton eventId={eventId} />
      </div>

      <CollapsibleSection title="Global Statistics" icon={BarChart2}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold">{globalStats.totalParticipants}</p><p className="text-sm text-gray-500">Participants</p></div>
          <div><p className="text-2xl font-bold">{globalStats.accredited}</p><p className="text-sm text-gray-500">Accredited</p></div>
          <div><p className="text-2xl font-bold text-green-600">{globalStats.accreditationRate}</p><p className="text-sm text-gray-500">Accreditation Rate</p></div>
          <div><p className="text-2xl font-bold">{globalStats.peakHour}</p><p className="text-sm text-gray-500">Peak Hour</p></div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Accreditations Over Time" icon={BarChart2}>
        <ChartAccreditations eventId={eventId} />
      </CollapsibleSection>

      <CollapsibleSection title="Attendance Details" icon={FileText}>
        <AttendanceTable eventId={eventId} />
      </CollapsibleSection>
      
      <CollapsibleSection title="Awards Summary" icon={AwardIcon}>
        <AwardsSummary eventId={eventId} />
      </CollapsibleSection>

    </div>
  );
};

export default EventReport;
