import React from 'react';
import EventDetails from '@/components/events/EventDetails';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface EventDetailsPageProps {
  params: {
    eventId: string;
  };
}

const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ params }) => {
  return (
    <ProtectedRoute>
      <main>
        <EventDetails eventId={params.eventId} />
      </main>
    </ProtectedRoute>
  );
};

export default EventDetailsPage;
