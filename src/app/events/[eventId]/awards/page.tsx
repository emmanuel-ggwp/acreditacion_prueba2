'use client';

import AwardList from '@/components/awards/AwardList';
import useEventStore from '@/store/eventStore';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AwardsPageProps {
  params: {
    eventId: string;
  };
}

const AwardsPage: React.FC<AwardsPageProps> = ({ params }) => {
  const { eventId } = params;
  const { currentEvent, fetchEventById } = useEventStore();

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId);
    }
  }, [eventId, fetchEventById]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/events" className="text-blue-500 hover:underline flex items-center">
          <ArrowLeft className="mr-2" size={16} />
          Volver a Eventos
        </Link>
      </div>
      {currentEvent && (
        <h1 className="text-3xl font-bold mb-4">
          Premios para el Evento: {currentEvent.name}
        </h1>
      )}
      <AwardList eventId={eventId} />
    </div>
  );
};

export default AwardsPage;
