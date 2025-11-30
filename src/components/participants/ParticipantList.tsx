'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import { PlusCircle, FileDown, FileUp } from 'lucide-react';
import ParticipantSearch from './ParticipantSearch';
import Participant from '@/models/Participant';

const ParticipantList = ({ eventId }: { eventId: string }) => {
  const router = useRouter();
  const { 
    participants, 
    loading, 
    error, 
    fetchParticipantsByEvent, 
    setCurrentParticipant 
  } = useParticipantStore();
  const { currentEvent } = useEventStore();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchParticipantsByEvent(eventId);
  }, [eventId, fetchParticipantsByEvent]);

  const handleSelectParticipant = (participant: Participant) => {
    setCurrentParticipant(participant);
    router.push(`/participants/${participant.id}`);
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      p.email.toLowerCase().includes(filter.toLowerCase()) ||
      p.documentNumber?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [participants, filter]);

  if (loading) return <div>Loading participants...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          Participants for {currentEvent?.name}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push(`/events/${eventId}/participants/new`)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusCircle size={20} />
            New Participant
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
            <FileUp size={20} />
            Import
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
            <FileDown size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="mb-4">
        <ParticipantSearch eventId={eventId} onSelect={handleSelectParticipant} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredParticipants.map((participant) => (
              <tr key={participant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{`${participant.firstName} ${participant.lastName}`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.documentNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    participant.accredited ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {participant.accredited ? 'Accredited' : 'Not Accredited'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    handleSelectParticipant(participant);
                  }} className="text-indigo-600 hover:text-indigo-900">View/Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantList;
