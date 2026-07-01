'use client';

import React, { useState, useCallback } from 'react';
import { Search, UserCheck } from 'lucide-react';
import useParticipantStore from '@/store/participantStore';
import { debounce } from 'lodash';
import Participant from '@/models/Participant';
import apiClient from '@/utils/apiClient';

interface ParticipantSearchProps {
  eventId: string;
  onSelect: (participant: Participant) => void;
}

const ParticipantSearch: React.FC<ParticipantSearchProps> = ({ eventId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { searchParticipants: storeSearchParticipants } = useParticipantStore();

  // This would ideally call a dedicated search service/store function
  const searchParticipants = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
        const participants = await storeSearchParticipants(eventId, searchQuery);
        setResults(participants);
    } catch (error) {
        console.error("Search failed", error);
        setResults([]);
    } finally {
        setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(searchParticipants, 300), [eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

  const handleSelect = (participant: Participant) => {
    onSelect(participant);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Buscar por nombre, correo o documento..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      {isLoading && <div className="p-2 text-sm text-gray-500">Buscando...</div>}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((participant) => (
            <li
              key={participant.id}
              onClick={() => handleSelect(participant)}
              className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div>
                <p className="font-medium">{`${participant.firstName} ${participant.lastName}`}</p>
                <p className="text-sm text-gray-500">{participant.email}</p>
              </div>
              <button className="p-2 text-indigo-600 hover:text-indigo-800">
                <UserCheck size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && query.length > 2 && results.length === 0 && (
        <div className="p-2 text-sm text-gray-500">No se encontraron resultados.</div>
      )}
    </div>
  );
};

export default ParticipantSearch;
