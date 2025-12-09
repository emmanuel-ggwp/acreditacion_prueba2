'use client';

import React, { useEffect, useRef } from 'react';
import useAccreditationStore, { RichAccreditation } from '@/store/accreditationStore';
import { UserCheck, Clock } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface RecentAccreditationsProps {
  eventId: string;
}

const AccreditationItem = ({ acc, ...props }: { acc: RichAccreditation } & any) => {
  const nodeRef = useRef(null);
  return (
    <CSSTransition
      nodeRef={nodeRef}
      {...props}
    >
      <div ref={nodeRef} className="flex items-start p-3 bg-gray-50 rounded-md">
        <UserCheck className="h-6 w-6 text-green-500 mr-4 mt-1" />
        <div>
          <p className="font-semibold">
            {acc.Participant?.firstName || acc.Guest?.firstName} {acc.Participant?.lastName || acc.Guest?.lastName}
          </p>
          <p className="text-sm text-gray-500 flex items-center">
            <Clock size={14} className="mr-1" />
            {new Date(acc.checkInTime).toLocaleTimeString()} by {acc.accreditedByUser?.firstName}
          </p>
        </div>
      </div>
    </CSSTransition>
  );
};

const RecentAccreditations: React.FC<RecentAccreditationsProps> = ({ eventId }) => {
  const { accreditations, fetchAccreditations } = useAccreditationStore();

  useEffect(() => {
    if (eventId) {
      const interval = setInterval(() => {
        fetchAccreditations(eventId, 1, 10);
      }, 10000); // Refresh every 5 seconds
      
      // Initial fetch
      fetchAccreditations(eventId, 1, 10);

      return () => clearInterval(interval);
    }
  }, [eventId, fetchAccreditations]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      <div className="space-y-4 h-96 overflow-y-auto">
        <TransitionGroup>
          {accreditations.map(acc => (
            <AccreditationItem
              key={acc.id}
              acc={acc}
              timeout={500}
              classNames="accreditation-item"
            />
          ))}
        </TransitionGroup>
        {accreditations.length === 0 && (
          <p className="text-gray-500 text-center pt-10">No accreditations yet for this event.</p>
        )}
      </div>
      <style jsx>{`
        .accreditation-item-enter {
          opacity: 0;
          transform: translateY(-20px);
        }
        .accreditation-item-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 300ms, transform 300ms;
        }
        .accreditation-item-exit {
          opacity: 1;
        }
        .accreditation-item-exit-active {
          opacity: 0;
          transition: opacity 300ms;
        }
      `}</style>
    </div>
  );
};

export default RecentAccreditations;
