'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';
import useParticipantStore from '@/store/participantStore';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';

interface SearchParticipantProps {
  eventId: string;
  onSelect: (person: { type: 'participant' | 'guest', data: Participant | Guest }) => void;
}

const SearchParticipant: React.FC<SearchParticipantProps> = ({ eventId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Participant | Guest)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { searchParticipants } = useParticipantStore();

  const searchPeopleHandler = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await searchParticipants(eventId, searchQuery);

      setResults([...(response || [])]);
    } catch (error) {
      setResults([]);
    }
    setIsLoading(false);
  };

  const debouncedSearch = useCallback(debounce(searchPeopleHandler, 400), [eventId]);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleSelect = (person: Participant | Guest) => {
    const type = 'firstName' in person ? 'participant' : 'guest';
    onSelect({ type: 'participant', data: person as Participant }); // Placeholder
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or document..."
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      {isLoading && <div className="p-2 text-sm text-gray-500">Searching...</div>}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          {results.map((person) => (
            <li
              key={person.id}
              onClick={() => handleSelect(person)}
              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
            >
              <p className="font-medium text-base">{`${(person as any).firstName} ${(person as any).lastName}`}</p>
              <p className="text-sm text-gray-500">{(person as any).email || 'Guest'}</p>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && query.length > 2 && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm text-gray-500">
          No results found for "{query}".
        </div>
      )}
    </div>
  );
};

export default SearchParticipant;
