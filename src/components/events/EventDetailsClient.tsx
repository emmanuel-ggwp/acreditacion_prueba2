'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import EventDetails from './EventDetails';

interface Props {
  eventId: string;
}

const EventDetailsClient: React.FC<Props> = ({ eventId }) => {
  return (
    <ProtectedRoute>
      <EventDetails eventId={eventId} />
    </ProtectedRoute>
  );
};

export default EventDetailsClient;
