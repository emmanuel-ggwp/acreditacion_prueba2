'use client';

import React, { useState, useEffect } from 'react';
import useAwardStore from '@/store/awardStore';
import { PlusCircle } from 'lucide-react';
import AwardCard from './AwardCard';
import AwardForm from './AwardForm';
import Award from '@/models/Award';

interface AwardListProps {
  eventId: string;
}

const AwardList: React.FC<AwardListProps> = ({ eventId }) => {
  const { awards, fetchAwardsByEvent, loading, error } = useAwardStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);

  useEffect(() => {
    fetchAwardsByEvent(eventId);
  }, [eventId, fetchAwardsByEvent]);

  const handleEdit = (award: Award) => {
    setSelectedAward(award);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAward(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedAward(null);
    fetchAwardsByEvent(eventId); // Refresh list after form close
  };

  if (loading) return <p>Cargando premios…</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Premios</h2>
        <button
          onClick={handleAddNew}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <PlusCircle size={20} />
          Nuevo Premio
        </button>
      </div>

      {isFormOpen && (
        <div className="mb-8">
          <AwardForm
            eventId={eventId}
            award={selectedAward}
            onClose={handleFormClose}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {awards.map((award: Award) => (
          <AwardCard
            key={award.id}
            award={award}
            onEdit={handleEdit}
          />
        ))}
      </div>
      {awards.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-8">No se encontraron premios para este evento. Agrega uno para comenzar.</p>
      )}
    </div>
  );
};

export default AwardList;
