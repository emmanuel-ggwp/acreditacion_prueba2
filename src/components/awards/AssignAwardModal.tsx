'use client';

import React, { useState } from 'react';
import useAwardStore from '@/store/awardStore';
import ParticipantSearch from '@/components/participants/ParticipantSearch';
import Participant from '@/models/Participant';
import Award from '@/models/Award';
import { Loader2 } from 'lucide-react';

interface AssignAwardModalProps {
  eventId: string;
  onClose: () => void;
}

const AssignAwardModal: React.FC<AssignAwardModalProps> = ({ eventId, onClose }) => {
  const { awards, assignAward, loading, error } = useAwardStore();
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedAwardId, setSelectedAwardId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleAssign = async () => {
    if (!selectedParticipant || !selectedAwardId) {
      alert('Por favor selecciona un participante y un premio.');
      return;
    }
    try {
      await assignAward(selectedAwardId, selectedParticipant.id, notes);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Asignar Premio</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Participante</label>
            <ParticipantSearch eventId={eventId} onSelect={(p) => setSelectedParticipant(p as Participant)} />
          </div>

          {selectedParticipant && (
            <div className="p-3 bg-indigo-50 rounded-md">
              <p className="font-semibold">{selectedParticipant.firstName} {selectedParticipant.lastName}</p>
              <p className="text-sm text-gray-600">{selectedParticipant.email}</p>
            </div>
          )}

          <div>
            <label htmlFor="award-select" className="block text-sm font-medium text-gray-700">Seleccionar Premio</label>
            <select
              id="award-select"
              value={selectedAwardId}
              onChange={(e) => setSelectedAwardId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">-- Selecciona un premio --</option>
              {awards.map((award: Award) => (
                <option key={award.id} value={award.id}>
                  {award.name} (Stock: {award.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} disabled={loading} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300">
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedParticipant || !selectedAwardId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAwardModal;
