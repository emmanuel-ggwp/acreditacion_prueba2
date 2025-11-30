'use client';

import React, { useState, useEffect } from 'react';
import EventSchedule from '@/models/EventSchedule';
import useAccreditationStore from '@/store/accreditationStore';

interface CapacityIndicatorProps {
  schedule: EventSchedule;
}

const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({ schedule }) => {
  // In a real app, this would be pushed from the server or fetched periodically
  const [accreditedCount, setAccreditedCount] = useState(0);
  const { accreditations } = useAccreditationStore();

  useEffect(() => {
    // This is a mock. Ideally, the store/service provides a live count for the schedule.
    const count = accreditations.filter(a => a.eventScheduleId === schedule.id).length;
    setAccreditedCount(count);
  }, [accreditations, schedule.id]);

  const capacity = schedule.maxCapacity;
  if (capacity === null || capacity === undefined) {
    return null; // Don't show indicator if no capacity is set
  }

  const percentage = capacity > 0 ? (accreditedCount / capacity) * 100 : 0;
  
  let bgColor = 'bg-green-500';
  if (percentage > 90) {
    bgColor = 'bg-red-500';
  } else if (percentage > 75) {
    bgColor = 'bg-yellow-500';
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Schedule Capacity</h2>
      <p className="text-sm text-gray-600 mb-3">{schedule.scheduleName}</p>
      <div className="flex justify-between items-center mb-1 font-semibold">
        <span>{accreditedCount} Accredited</span>
        <span>{capacity} Total</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${bgColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-right mt-1 text-sm font-bold">{percentage.toFixed(1)}% Full</p>
    </div>
  );
};

export default CapacityIndicator;
