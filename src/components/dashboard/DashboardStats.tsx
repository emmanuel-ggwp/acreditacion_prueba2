'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, Award, CheckSquare, TrendingUp, ArrowUpRight, Activity, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import useEventStore from '@/store/eventStore';
import { ButtonEventReport } from '../events/ButtonEventReport';

interface ScheduleStat {
  id: string;
  scheduleName: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  registered: number;
  registeredTotal: number;
  registeredParticipants: number;
  registeredGuests: number;
  accreditedTotal: number;
  accreditedParticipants: number;
  accreditedGuests: number;
  awardsDelivered: number;
  capacityUsedPercentage: number;
}

interface EventStat {
  id: string;
  name: string;
  date: string;
  registered: number;
  attendees: number;
  awards: number;
  schedules: ScheduleStat[];
  participants: number;
  guests: number;
}

// Mock Data - Replace with actual data from your store/API
const mainStats = {
  activeEvents: 5,
  accreditationsToday: 128,
  pendingAwards: 32,
  activeUsers: 45,
};

const accreditationsByHourData = [
  { hour: '09:00', count: 15 },
  { hour: '10:00', count: 45 },
  { hour: '11:00', count: 62 },
  { hour: '12:00', count: 88 },
  { hour: '13:00', count: 105 },
  { hour: '14:00', count: 128 },
];

const eventsCapacityData = [
    { name: 'Tech Conf', accredited: 450, capacity: 500 },
    { name: 'Mkt Summit', accredited: 320, capacity: 400 },
    { name: 'Design Wkshp', accredited: 80, capacity: 100 },
    { name: 'Prod Launch', accredited: 150, capacity: 150 },
];

const ParticipantGuestChart = React.memo(({ participants, guests }: { participants: number, guests: number }) => {
  const total = participants + guests;
  if (total === 0) return null;

  const radius = 20;
  const strokeWidth = 12;
  const normalizedRadius = radius;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (participants / total) * circumference;

  return (
    <div className="flex items-center mt-2 pt-2 border-t border-gray-50">
      <div className="h-16 w-16 relative flex-shrink-0">
         <svg height="100%" width="100%" viewBox="0 0 64 64" className="transform -rotate-90">
            <circle
              stroke="#10b981"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
            <circle
              stroke="#6366f1"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
         </svg>
      </div>
      <div className="ml-3 text-xs space-y-1">
        <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
            <span className="text-gray-500">Part.: <span className="font-medium text-gray-900">{participants}</span></span>
        </div>
        <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div>
            <span className="text-gray-500">Inv.: <span className="font-medium text-gray-900">{guests}</span></span>
        </div>
      </div>
    </div>
  );
});

const EventStatCard = React.memo(({ stat, viewMode }: { stat: EventStat, viewMode: 'event' | 'date' }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 min-w-[280px]">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1 pr-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.name}</h4>
      </div>
      <div className="">
        <ButtonEventReport eventId={stat.id} eventName={stat.name} size={'large'} />
      </div>
    </div>
    
    {viewMode === 'event' ? (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Inscritos: <span className="font-medium text-gray-900">{stat.registered}</span></p>
        <p className="text-sm text-gray-600">
          Asistentes: <span className="font-medium text-gray-900">{stat.attendees}</span> 
          <span className="text-gray-500 ml-1">(Premiados: {stat.awards})</span>
        </p>
        <ParticipantGuestChart participants={stat.participants} guests={stat.guests} />
      </div>
    ) : (
      <div className="space-y-4">
        {stat.schedules.map((schedule) => (
          <div key={schedule.id} className="border-b border-gray-100 pb-6 mb-6 last:border-0 last:mb-0 last:pb-0">
            <div className="mb-4">
                <p className="text-base font-semibold text-gray-900">{schedule.scheduleName}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(schedule.startDateTime).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">Inscritos</p>
                <p className="text-xl font-bold text-gray-900">{schedule.registered}</p>
                <ParticipantGuestChart participants={schedule.registeredParticipants} guests={schedule.registeredGuests} />
              </div>
              <div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Asistentes</p>
                        <p className="text-xl font-bold text-gray-900">{schedule.accreditedTotal}</p>
                    </div>
                    {schedule.awardsDelivered > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400 mb-0.5">Premiados</p>
                            <p className="text-sm font-medium text-gray-700">{schedule.awardsDelivered}</p>
                        </div>
                    )}
                </div>
                <ParticipantGuestChart participants={schedule.accreditedParticipants} guests={schedule.accreditedGuests} />
              </div>
            </div>
          </div>
        ))}
        {stat.schedules.length === 0 && <p className="text-sm text-gray-500 italic">No schedules found.</p>}
      </div>
    )}
  </div>
));

const StatCard = React.memo(({ title, value, icon: Icon, trend, trendUp }: { title: string; value: number | string; icon: React.ElementType, trend?: string, trendUp?: boolean }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Icon className="h-6 w-6" />
        </div>
        {trend && (
            <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'}`}>
                <TrendingUp size={14} className={`mr-1 ${trendUp ? '' : 'text-gray-400'}`} />
                {trend}
            </span>
        )}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
    </div>
  </div>
));

const DashboardStats: React.FC = () => {
  const { events, fetchEvents, total, loading: eventsLoading } = useEventStore();
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [viewMode, setViewMode] = useState<'event' | 'date'>('date');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchEvents({ page: currentPage, limit: itemsPerPage });
  }, [fetchEvents, currentPage]);

  useEffect(() => {
    const fetchStats = async () => {
      if (eventsLoading) return;

      setLoadingStats(true);
      
      if (events.length === 0) {
          setEventStats([]);
          setLoadingStats(false);
          return;
      }
      
      try {
        // Call batch reports endpoint with all event IDs in a single request
        const idsParam = events.map(event => event.id).join(',');
        const reports = await apiClient.get<any[]>(`/api/reports/events?ids=${idsParam}`);

        // Map reports by eventId for quick lookup
        const reportMap = new Map<string, any>(
          reports.map((report: any) => [report.eventInfo.id, report])
        );

        const results = events.map((event) => {
          try {
            const report = reportMap.get(event.id);
            if (!report) return null;

            const schedules = report.scheduleStats || [];
            let date = 'N/A';
            let scheduleStats: ScheduleStat[] = [];

            if (schedules.length > 0) {
                const dates = schedules.map((s: any) => new Date(s.startDateTime).getTime());
                const minDate = new Date(Math.min(...dates));
                date = minDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-');
                
                scheduleStats = schedules.map((s: any, index: number) => ({
                  id: `${event.id}-${index}`,
                  scheduleName: s.scheduleName,
                  startDateTime: s.startDateTime,
                  endDateTime: s.endDateTime,
                  capacity: s.capacity,
                  registered: s.registered,
                  registeredTotal: s.registeredTotal,
                  registeredParticipants: s.registeredParticipants,
                  registeredGuests: s.registeredGuests,
                  accreditedTotal: s.accreditedTotal,
                  accreditedParticipants: s.accreditedParticipants,
                  accreditedGuests: s.accreditedGuests,
                  awardsDelivered: s.awardsDelivered,
                  capacityUsedPercentage: s.capacityUsedPercentage
                }));
            }
            return {
              id: event.id,
              name: event.name,
              date: date,
              registered: report.participantStats.registered,
              attendees: report.participantStats.totalAccredited,
              awards: report.awardStats.delivered,
              schedules: scheduleStats,
              participants: report.participantStats.accredited || 0,
              guests: report.participantStats.accreditedGuests || 0
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        });

        setEventStats(results.filter(r => r !== null) as EventStat[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [events, eventsLoading]);

  return (
    <div className="space-y-8">
      

      {/* Main Stats Cards display none*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ display: 'none' }}>
        <StatCard title="Active Events" value={total} icon={Calendar} trend="+2 this week" trendUp={true} />
        <StatCard title="Accreditations Today" value={mainStats.accreditationsToday} icon={CheckSquare} trend="+12% vs yesterday" trendUp={true} />
        <StatCard title="Pending Awards" value={mainStats.pendingAwards} icon={Award} trend="Needs attention" />
        <StatCard title="Active Users" value={mainStats.activeUsers} icon={Users} trend="+5 new users" trendUp={true} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ display: 'none' }}>
        {/* Area Chart */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="font-bold text-xl text-gray-900 flex items-center">
                  <Activity className="mr-2 text-indigo-500" size={20} />
                  Accreditations Trend
                </h3>
                <p className="text-sm text-gray-500 mt-1 ml-7">Hourly breakdown for today</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <ArrowUpRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={accreditationsByHourData}>
                <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="font-bold text-xl text-gray-900">Capacity Overview</h3>
                <p className="text-sm text-gray-500 mt-1">Accredited vs Total Capacity</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <ArrowUpRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsCapacityData} barSize={32} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                />
                <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="accredited" fill="#6366f1" radius={[6, 6, 6, 6]} name="Accredited" />
                <Bar dataKey="capacity" fill="#e0e7ff" radius={[6, 6, 6, 6]} name="Total Capacity" />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Event Statistics Section */}
      <div className="space-y-4">
        <div className="relative inline-block text-left">
          <div>
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-indigo-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {viewMode === 'event' ? 'Ver Total por Evento' : 'Ver Total por Fecha'}
              <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {showDropdown && (
            <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button
                  onClick={() => { setViewMode('event'); setShowDropdown(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  role="menuitem"
                >
                  Ver Total por Evento
                </button>
                <button
                  onClick={() => { setViewMode('date'); setShowDropdown(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  role="menuitem"
                >
                  Ver Total por Fecha
                </button>
              </div>
            </div>
          )}
        </div>

        {loadingStats || eventsLoading ? (
            <div className="text-center py-10">Loading statistics...</div>
        ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventStats.map(stat => (
                      <EventStatCard key={stat.id} stat={stat} viewMode={viewMode} />
                  ))}
                  {eventStats.length === 0 && <div className="text-gray-500">No events found.</div>}
              </div>
              
              {total > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(total / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(total / itemsPerPage)}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, total)}</span> de <span className="font-medium">{total}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Anterior</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(total / itemsPerPage), p + 1))}
                          disabled={currentPage === Math.ceil(total / itemsPerPage)}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Siguiente</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
