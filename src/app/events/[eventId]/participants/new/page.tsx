'use client';

import React from 'react';
import ParticipantForm from '@/components/participants/ParticipantForm';
import { useParams, useRouter } from 'next/navigation';

const NewParticipantPage = () => {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  if (!eventId) {
    return <div>Cargando…</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Crear Nuevo Participante</h1>
        <ParticipantForm eventId={eventId} onClose={() => router.back()} />
      </div>
    </div>
  );
};

export default NewParticipantPage;
