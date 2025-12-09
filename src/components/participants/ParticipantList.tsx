'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import useAuthStore from '@/store/authStore';
import { PlusCircle, FileDown, FileUp, Edit, Trash2 } from 'lucide-react';
import ParticipantSearch from './ParticipantSearch';
import Participant from '@/models/Participant';
import ParticipantForm from './ParticipantForm';
import { showToast } from '@/components/ui/Toast';

const ParticipantList = ({ eventId }: { eventId: string }) => {
  const router = useRouter();
  const { 
    participants, 
    loading, 
    error, 
    total,
    fetchParticipantsByEvent, 
    setCurrentParticipant,
    deleteParticipant
  } = useParticipantStore();
  const { currentEvent } = useEventStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | undefined>(undefined);

  const isEventFull = useMemo(() => {
    if (!currentEvent?.maxCapacity) return false;
    return total >= currentEvent.maxCapacity;
  }, [currentEvent, total]);

  useEffect(() => {
    fetchParticipantsByEvent(eventId);
  }, [eventId, fetchParticipantsByEvent]);

  const handleSelectParticipant = (participant: Participant) => {
    setCurrentParticipant(participant);
    // router.push(`/participants/${participant.id}`);
    handleEdit(participant);
  };

  const handleEdit = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this participant?')) {
      await deleteParticipant(id);
      fetchParticipantsByEvent(eventId);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedParticipant(undefined);
    fetchParticipantsByEvent(eventId);
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      p.email.toLowerCase().includes(filter.toLowerCase()) ||
      (p.documentNumber && p.documentNumber.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [participants, filter]);

  if (loading && participants.length === 0) return <div className="p-4 text-center">Loading participants...</div>;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {error && !isFormOpen && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Participants
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setSelectedParticipant(undefined); setIsFormOpen(true); }}
            disabled={isEventFull}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              isEventFull 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title={isEventFull ? 'Event capacity reached' : 'Add new participant'}
          >
            <PlusCircle size={18} />
            New Participant
          </button>
          <button 
            disabled={isEventFull}
            className={`border px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              isEventFull
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title={isEventFull ? 'Event capacity reached' : 'Import participants'}
          >
            <FileUp size={18} />
            Import
          </button>
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors">
            <FileDown size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="mb-6">
        <ParticipantSearch eventId={eventId} onSelect={handleSelectParticipant} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{`${participant.firstName} ${participant.lastName}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.documentNumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleEdit(participant as any)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(participant.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  No participants found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ParticipantForm 
          eventId={eventId} 
          participant={selectedParticipant} 
          onClose={handleCloseForm} 
        />
      )}
    </div>
  );
};

export default ParticipantList;
