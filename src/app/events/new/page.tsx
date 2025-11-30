import React from 'react';
import EventForm from '@/components/events/EventForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/constants';

const NewEventPage = () => {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCREDITATION_STAFF]}>
      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
          <EventForm />
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default NewEventPage;
