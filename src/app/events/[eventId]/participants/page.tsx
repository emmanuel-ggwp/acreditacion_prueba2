'use client';

import React from 'react';
import ParticipantList from '@/components/participants/ParticipantList';
import { useParams } from 'next/navigation';

const ParticipantsPage = () => {
  const params = useParams();
  const eventId = params.eventId as string;

  if (!eventId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <ParticipantList eventId={eventId} />
    </div>
  );
};

export default ParticipantsPage;
