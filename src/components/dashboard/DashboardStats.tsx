'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Calendar, Award, CheckSquare } from 'lucide-react';

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
    { name: 'Tech Conference', accredited: 450, capacity: 500 },
    { name: 'Marketing Summit', accredited: 320, capacity: 400 },
    { name: 'Design Workshop', accredited: 80, capacity: 100 },
    { name: 'Product Launch', accredited: 150, capacity: 150 },
];

const StatCard = ({ title, value, icon: Icon }: { title: string; value: number | string; icon: React.ElementType }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div className="bg-indigo-100 p-3 rounded-full">
      <Icon className="h-6 w-6 text-indigo-600" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const DashboardStats: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Events" value={mainStats.activeEvents} icon={Calendar} />
        <StatCard title="Accreditations Today" value={mainStats.accreditationsToday} icon={CheckSquare} />
        <StatCard title="Pending Awards" value={mainStats.pendingAwards} icon={Award} />
        <StatCard title="Active Users" value={mainStats.activeUsers} icon={Users} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-lg mb-4">Accreditations by Hour (Today)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accreditationsByHourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} name="Accreditations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-lg mb-4">Event Capacity Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventsCapacityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="accredited" stackId="a" fill="#818cf8" name="Accredited" />
              <Bar dataKey="capacity" stackId="b" fill="#c7d2fe" name="Total Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
