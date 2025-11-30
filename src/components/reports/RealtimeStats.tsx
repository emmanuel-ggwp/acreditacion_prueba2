'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';

// Mock fetch function
const fetchRealtimeData = async () => {
  console.log('Fetching new data...');
  // In a real app, this would be an API call
  return {
    accreditationsNow: Math.floor(Math.random() * 5) + 1, // Simulate new accreditations
    totalAccredited: 950 + Math.floor(Math.random() * 20),
    accreditationsByHour: [
      { hour: '09:00', count: 15 },
      { hour: '10:00', count: 45 },
      { hour: '11:00', count: 62 },
      { hour: '12:00', count: 88 },
      { hour: '13:00', count: 105 },
      { hour: '14:00', count: 128 + Math.floor(Math.random() * 10) },
    ]
  };
};

const RealtimeStats: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      const newData = await fetchRealtimeData();
      setData(newData);
      setLastUpdated(new Date());
    };

    loadData(); // Initial load
    const intervalId = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  if (!data) {
    return <div className="text-center p-10">Loading real-time data...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Real-Time Dashboard</h2>
        <div className="text-sm text-gray-500 flex items-center">
          <RefreshCw size={14} className="mr-2 animate-spin" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-center">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-4xl font-bold text-indigo-600">{data.totalAccredited}</p>
          <p className="text-gray-600">Total Accredited Participants</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-4xl font-bold text-green-500">+{data.accreditationsNow}</p>
          <p className="text-gray-600">Accredited in Last 30s</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Accreditations by Hour</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.accreditationsByHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} name="Accreditations" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RealtimeStats;
