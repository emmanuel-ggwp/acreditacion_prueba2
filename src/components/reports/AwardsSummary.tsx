'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Mock Data
const awardsData = [
  { name: 'VIP Swag Bag', delivered: 150, pending: 25 },
  { name: 'Lunch Voucher', delivered: 400, pending: 50 },
  { name: 'T-Shirt', delivered: 300, pending: 10 },
];

const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc'];

const AwardsSummary: React.FC<{ eventId: string }> = ({ eventId }) => {
  const chartData = awardsData.map(award => ({ name: award.name, value: award.delivered + award.pending }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg mb-4">Award Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg mb-4">Award Status</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Award Name</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Delivered</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Pending</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {awardsData.map((award, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 text-sm">{award.name}</td>
                  <td className="p-3 text-sm text-green-600">{award.delivered}</td>
                  <td className="p-3 text-sm text-orange-500">{award.pending}</td>
                  <td className="p-3 text-sm font-bold">{award.delivered + award.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AwardsSummary;
