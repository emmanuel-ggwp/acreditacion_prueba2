'use client';

import React, { useEffect, useState } from 'react';
import useEventStore from '@/store/eventStore';
import EventCard from './EventCard';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';

type FilterType = 'all' | 'active' | 'inactive' | 'mine';

const EventList = () => {
  const { events, fetchEvents, loading, total, page, limit } = useEventStore();
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    // TODO: Adjust fetchEvents to support filtering
    fetchEvents(1, 10);
  }, [fetchEvents, filter]);

  const handlePageChange = (newPage: number) => {
    fetchEvents(newPage, limit);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.ACCREDITATION_STAFF]}>
          <Link href="/events/new">
            <button className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              <PlusCircle size={20} className="mr-2" />
              Create Event
            </button>
          </Link>
        </RoleGuard>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4">
        <div className="flex space-x-4 border-b">
          <button onClick={() => setFilter('all')} className={`py-2 px-4 ${filter === 'all' ? 'border-b-2 border-indigo-600 font-semibold' : ''}`}>All</button>
          <button onClick={() => setFilter('active')} className={`py-2 px-4 ${filter === 'active' ? 'border-b-2 border-indigo-600 font-semibold' : ''}`}>Active</button>
          <button onClick={() => setFilter('inactive')} className={`py-2 px-4 ${filter === 'inactive' ? 'border-b-2 border-indigo-600 font-semibold' : ''}`}>Inactive</button>
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.ACCREDITATION_STAFF]}>
            <button onClick={() => setFilter('mine')} className={`py-2 px-4 ${filter === 'mine' ? 'border-b-2 border-indigo-600 font-semibold' : ''}`}>My Events</button>
          </RoleGuard>
        </div>
      </div>

      {loading ? (
        <div className="text-center">Loading events...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {events.length === 0 && <p>No events found.</p>}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`px-4 py-2 text-sm font-medium ${p === page ? 'bg-indigo-500 text-white' : 'text-gray-700 bg-white'} border-t border-b border-gray-300 hover:bg-gray-50`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default EventList;
