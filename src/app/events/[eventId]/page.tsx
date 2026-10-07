import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import EventDetails from '@/components/events/EventDetails';

interface EventDetailsPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

const EventDetailsPage = async ({ params }: EventDetailsPageProps) => {
  const { eventId } = await params;
  return (
    <main>
      <ProtectedRoute>
        <EventDetails eventId={eventId} />
      </ProtectedRoute>
    </main>
  );
};

export default EventDetailsPage;
