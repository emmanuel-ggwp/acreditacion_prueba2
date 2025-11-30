'use client';

import React, { useState, useMemo } from 'react';
import { useTable, useSortBy, useFilters, useGlobalFilter } from 'react-table';
import { Download, Printer } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

// Mock Data
const mockData = [
  { id: 1, name: 'John Doe', email: 'john.d@example.com', status: 'Accredited', time: '09:15 AM', schedule: 'Main Conference' },
  { id: 2, name: 'Jane Smith', email: 'jane.s@example.com', status: 'Pending', time: '-', schedule: 'Main Conference' },
  { id: 3, name: 'Peter Jones', email: 'peter.j@example.com', status: 'Accredited', time: '10:30 AM', schedule: 'Workshop A' },
  // ... more data
];

const GlobalFilter = ({ globalFilter, setGlobalFilter }: any) => (
  <input
    value={globalFilter || ''}
    onChange={e => setGlobalFilter(e.target.value || undefined)}
    placeholder="Search all columns..."
    className="border border-gray-300 rounded-md p-2 w-full sm:w-1/3"
  />
);

const AttendanceTable: React.FC<{ eventId: string }> = ({ eventId }) => {
  const data = useMemo(() => mockData, []);
  const columns = useMemo(() => [
    { Header: 'Name', accessor: 'name' },
    { Header: 'Email', accessor: 'email' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Accreditation Time', accessor: 'time' },
    { Header: 'Schedule', accessor: 'schedule' },
  ], []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    setGlobalFilter,
  } = useTable({ columns, data }, useFilters, useGlobalFilter, useSortBy);

  const handleExport = () => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Attendance");
    writeFile(wb, `Attendance_Event_${eventId}.xlsx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <GlobalFilter globalFilter={state.globalFilter} setGlobalFilter={setGlobalFilter} />
        <div>
          <button onClick={handleExport} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-200 flex items-center mr-2">
            <Download size={16} className="mr-1" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 flex items-center">
            <Printer size={16} className="mr-1" /> Print
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table {...getTableProps()} className="min-w-full bg-white">
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="p-3 border-b-2 border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-600">
                    {column.render('Header')}
                    <span>{column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}</span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="hover:bg-gray-50">
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} className="p-3 border-b border-gray-200 text-sm">{cell.render('Cell')}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
