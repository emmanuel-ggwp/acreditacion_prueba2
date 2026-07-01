'use client';

import React, { useEffect } from 'react';
import ParticipantForm from '@/components/participants/ParticipantForm';
import { useParams, useRouter } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';

const EditParticipantPage = () => {
  const params = useParams();
  const router = useRouter();
  const participantId = params.participantId as string;
  const { currentParticipant, fetchParticipantById, loading } = useParticipantStore();

  useEffect(() => {
    if (participantId) {
      fetchParticipantById(participantId);
    }
  }, [participantId, fetchParticipantById]);

  if (loading || !currentParticipant) {
    return <div>Cargando…</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Editar Participante</h1>
        <ParticipantForm eventId={currentParticipant.eventId} participant={currentParticipant} onClose={() => router.back()} />
      </div>
    </div>
  );
};

export default EditParticipantPage;
