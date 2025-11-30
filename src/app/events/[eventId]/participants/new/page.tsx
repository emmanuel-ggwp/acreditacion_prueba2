'use client';

import React from 'react';
import ParticipantForm from '@/components/participants/ParticipantForm';
import { useParams } from 'next/navigation';

const NewParticipantPage = () => {
  const params = useParams();
  const eventId = params.eventId as string;

  if (!eventId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Participant</h1>
        <ParticipantForm eventId={eventId} />
      </div>
    </div>
  );
};

export default NewParticipantPage;
