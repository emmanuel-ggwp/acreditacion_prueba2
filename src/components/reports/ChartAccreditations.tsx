'use client';

import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock Data
const data = [
  { time: '09:00', Main: 15, WorkshopA: 5 },
  { time: '10:00', Main: 45, WorkshopA: 12 },
  { time: '11:00', Main: 62, WorkshopA: 25, WorkshopB: 10 },
  { time: '12:00', Main: 88, WorkshopA: 30, WorkshopB: 22 },
  { time: '13:00', Main: 105, WorkshopB: 40 },
  { time: '14:00', Main: 128, WorkshopB: 55 },
];

const ChartAccreditations: React.FC<{ eventId: string }> = ({ eventId }) => {
  return (
    <div className="space-y-8">
      <div>
        <h4 className="font-semibold text-md mb-4">Accreditations by Schedule (Line Chart)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Main" stroke="#8884d8" name="Main Conference" />
            <Line type="monotone" dataKey="WorkshopA" stroke="#82ca9d" name="Workshop A" />
            <Line type="monotone" dataKey="WorkshopB" stroke="#ffc658" name="Workshop B" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 className="font-semibold text-md mb-4">Accreditations by Schedule (Bar Chart)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Main" stackId="a" fill="#8884d8" name="Main Conference" />
            <Bar dataKey="WorkshopA" stackId="a" fill="#82ca9d" name="Workshop A" />
            <Bar dataKey="WorkshopB" stackId="a" fill="#ffc658" name="Workshop B" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartAccreditations;
