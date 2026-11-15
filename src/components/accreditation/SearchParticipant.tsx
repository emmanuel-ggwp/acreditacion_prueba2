'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { debounce } from 'lodash';
import useParticipantStore from '@/store/participantStore';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';

interface SearchParticipantProps {
  eventId: string;
  onSelect: (person: { type: 'participant' | 'guest', data: Participant | Guest }) => void;
  scheduleId?: string;
}

const SearchParticipant: React.FC<SearchParticipantProps> = ({ eventId, onSelect, scheduleId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Participant | Guest)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { searchParticipants } = useParticipantStore();
  const seqRef = useRef(0);

  const searchPeopleHandler = async (searchQuery: string) => {
    const term = searchQuery.trim();
    const sequence = ++seqRef.current;
    setSearchError(null);
    if (term.length < 3) { setResults([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const response = await searchParticipants(eventId, term, scheduleId);
      if (sequence !== seqRef.current) return;
      setResults(response || []);
    } catch {
      if (sequence !== seqRef.current) return;
      setResults([]);
      setSearchError('No se pudo consultar a los participantes. Comprueba tu conexión o sesión y reintenta.');
    } finally {
      if (sequence === seqRef.current) setIsLoading(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(searchPeopleHandler, 400), [eventId, scheduleId, searchParticipants]);
  useEffect(() => {
    ++seqRef.current;
    setResults([]); setSearchError(null); setIsLoading(query.trim().length >= 3);
    debouncedSearch(query);
    return () => { ++seqRef.current; debouncedSearch.cancel(); };
  }, [query, debouncedSearch]);

  const changeQuery = (value: string) => {
    ++seqRef.current; // invalidar de inmediato, incluso durante la espera del debounce
    setQuery(value); setResults([]); setSearchError(null); setIsLoading(value.trim().length >= 3);
  };
  const handleSelect = (person: Participant | Guest) => {
    onSelect({ type: 'participant', data: person as Participant });
    changeQuery('');
  };

  return (
    <div className="relative w-full" aria-busy={isLoading}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
        <input type="text" value={query} onChange={event => changeQuery(event.target.value)}
          aria-label="Buscar participante por nombre, apellido, correo o RUT"
          placeholder="Buscar por nombre, correo o RUT..."
          className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg text-lg focus:ring-indigo-500 focus:border-indigo-500" />
        {query && <button type="button" onClick={() => changeQuery('')} aria-label="Limpiar búsqueda"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>}
      </div>
      {isLoading && <div role="status" className="p-2 text-sm text-gray-500">Buscando...</div>}
      {searchError && <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p>{searchError}</p>
        <button type="button" onClick={() => void searchPeopleHandler(query)} className="mt-2 font-semibold underline">Reintentar búsqueda</button>
      </div>}
      {results.length > 0 && <ul aria-label="Resultados de participantes" className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
        {results.map(person => <li key={person.id} className="border-b last:border-b-0">
          <button type="button" onClick={() => handleSelect(person)} className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 focus:bg-gray-100">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-base truncate">{`${person.firstName} ${person.lastName || ''}`}</p>
              <p className="text-sm text-gray-500 truncate">{[person.documentNumber, (person as any).email].filter(Boolean).join(' · ') || 'Sin RUT ni correo'}</p>
            </div><ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
          </button>
        </li>)}
      </ul>}
      {!isLoading && !searchError && query.trim().length >= 3 && results.length === 0 &&
        <div role="status" className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm text-gray-500">No se encontraron resultados para "{query}".</div>}
    </div>
  );
};
export default SearchParticipant;
