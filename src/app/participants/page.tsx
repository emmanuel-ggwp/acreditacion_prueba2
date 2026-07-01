'use client';

import React, { useEffect, useState } from 'react';
import ParticipantList from '@/components/participants/ParticipantList';
import apiClient from '@/utils/apiClient';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ParticipantsIndexPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>('/api/events?page=1&limit=100')
      .then((res) => {
        const list = res.events || res.data || (Array.isArray(res) ? res : []);
        setEvents(list);
        if (list.length) setEventId(list[0].id);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]}>
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="event-select" className="text-sm font-medium text-gray-700">Evento:</label>
          <select
            id="event-select"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[240px]"
          >
            {events.length === 0 && <option value="">— Sin eventos —</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : eventId ? (
          <ParticipantList key={eventId} eventId={eventId} />
        ) : (
          <p className="text-gray-500">No hay eventos. Crea un evento para ver sus participantes.</p>
        )}
      </div>
    </RoleGuard>
  );
};

export default ParticipantsIndexPage;
