'use client';

import React, { useEffect, useState, useRef } from 'react';
import useEventStore from '@/store/eventStore';
import EventCard from './EventCard';
import { PlusCircle, CalendarX, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import RoleGuard from '../auth/RoleGuard';
import { ROLES } from '@/utils/constants';

type FilterType = 'all' | 'accredited' | 'accrediting' | 'upcoming' | 'cancelled';

const EventList = () => {
  const { events, fetchEvents, loading, total, page, limit } = useEventStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [siblingCount, setSiblingCount] = useState(1);
  const paginationContainerRef = useRef<HTMLDivElement>(null);
  const defaultFetchParams = { page: 1, limit: 9, includeSchedules: true };

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    if (loading || totalPages <= 1) return;

    const updateSiblingCount = () => {
      if (!paginationContainerRef.current) return;
      const containerWidth = paginationContainerRef.current.offsetWidth;
      // Approximate width of "Showing x to y of z results" is around 250px
      // Each button is approx 40px
      // Available space for pagination buttons
      const availableWidth = containerWidth - 280; // 250px text + 30px gap
      
      if (availableWidth > 500) {
        setSiblingCount(3);
      } else if (availableWidth > 300) {
        setSiblingCount(2);
      } else {
        setSiblingCount(1);
      }
    };

    // Run immediately to set initial state
    updateSiblingCount();
    
    const observer = new ResizeObserver(updateSiblingCount);
    if (paginationContainerRef.current) {
      observer.observe(paginationContainerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, totalPages]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params: any = { ...defaultFetchParams, search: searchTerm };
      if (filter !== 'all') {
        params.filter = filter;
      }
      fetchEvents(params);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchEvents, filter, searchTerm]);

  const handlePageChange = (newPage: number) => {
    const params: any = { ...defaultFetchParams, page: newPage, search: searchTerm };
    if (filter !== 'all') {
      params.filter = filter;
    }
    fetchEvents(params);
  };

  

  const tabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'accrediting', label: 'Acreditando' },
    { id: 'upcoming', label: 'Próximos' },
    { id: 'accredited', label: 'Acreditados' },
    { id: 'cancelled', label: 'Cancelados' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Events</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and monitor your events</p>
          </div>
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
            <Link href="/events/new">
              <button className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all duration-200 ease-in-out transform hover:scale-[1.02]">
                <PlusCircle size={18} className="mr-2" />
                Create Event
              </button>
            </Link>
          </RoleGuard>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === tab.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Placeholder for search - visual only for now */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-64 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
                <div className="flex gap-4 mt-auto">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                  <CalendarX className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
                <div className="mt-6">
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
                    <Link href="/events/new">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <PlusCircle className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        New Event
                      </button>
                    </Link>
                  </RoleGuard>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div ref={paginationContainerRef} className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-8 rounded-lg shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {(() => {
                    const renderPageButton = (p: number) => (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          p === page
                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {p}
                      </button>
                    );

                    const renderEllipsis = (key: string) => (
                      <span key={key} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                        ...
                      </span>
                    );

                    // Threshold for showing all pages without ellipses
                    // 5 fixed items (first, last, current, 2 ellipses) + 2 * siblingCount
                    const boundaryCount = 5 + 2 * siblingCount;

                    if (totalPages <= boundaryCount) {
                      return Array.from({ length: totalPages }, (_, i) => i + 1).map(renderPageButton);
                    }

                    const pages = [];
                    pages.push(renderPageButton(1));

                    const start = Math.max(2, page - siblingCount);
                    const end = Math.min(totalPages - 1, page + siblingCount);

                    if (start > 2) pages.push(renderEllipsis('start-ellipsis'));

                    for (let i = start; i <= end; i++) {
                      pages.push(renderPageButton(i));
                    }

                    if (end < totalPages - 1) pages.push(renderEllipsis('end-ellipsis'));

                    if (totalPages > 1) pages.push(renderPageButton(totalPages));

                    return pages;
                  })()}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventList;
