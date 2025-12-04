'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Calendar, Award, CheckSquare, TrendingUp, ArrowUpRight, Activity } from 'lucide-react';

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

const StatCard = ({ title, value, icon: Icon, trend, trendUp }: { title: string; value: number | string; icon: React.ElementType, trend?: string, trendUp?: boolean }) => (
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
);

const DashboardStats: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Events" value={mainStats.activeEvents} icon={Calendar} trend="+2 this week" trendUp={true} />
        <StatCard title="Accreditations Today" value={mainStats.accreditationsToday} icon={CheckSquare} trend="+12% vs yesterday" trendUp={true} />
        <StatCard title="Pending Awards" value={mainStats.pendingAwards} icon={Award} trend="Needs attention" />
        <StatCard title="Active Users" value={mainStats.activeUsers} icon={Users} trend="+5 new users" trendUp={true} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    </div>
  );
};

export default DashboardStats;
