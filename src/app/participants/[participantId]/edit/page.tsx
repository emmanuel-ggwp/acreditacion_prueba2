'use client';

import React, { useEffect } from 'react';
import ParticipantForm from '@/components/participants/ParticipantForm';
import { useParams } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';

const EditParticipantPage = () => {
  const params = useParams();
  const participantId = params.participantId as string;
  const { currentParticipant, fetchParticipantById, loading } = useParticipantStore();

  useEffect(() => {
    if (participantId) {
      fetchParticipantById(participantId);
    }
  }, [participantId, fetchParticipantById]);

  if (loading || !currentParticipant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Edit Participant</h1>
        <ParticipantForm eventId={currentParticipant.eventId} participant={currentParticipant} />
      </div>
    </div>
  );
};

export default EditParticipantPage;
