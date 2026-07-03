'use client';

import React from 'react';
import ParticipantDetails from '@/components/participants/ParticipantDetails';
import { useParams } from 'next/navigation';

const ParticipantDetailPage = () => {
  const params = useParams();
  const participantId = params.participantId as string;

  if (!participantId) {
    return <div>Cargando…</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <ParticipantDetails participantId={participantId} />
    </div>
  );
};

export default ParticipantDetailPage;
