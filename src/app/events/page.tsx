import React from 'react';
import EventList from '@/components/events/EventList';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const EventsPage = () => {
  return (
    <ProtectedRoute>
      <main>
        <EventList />
      </main>
    </ProtectedRoute>
  );
};

export default EventsPage;
