'use client';

import React from 'react';
import { useTable, useSortBy, usePagination, Column } from 'react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

interface TableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  renderRowActions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
}

function Table<T extends object>({ columns, data, renderRowActions, emptyMessage = "No data available." }: TableProps<T>) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table {...getTableProps()} className="min-w-full">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="p-3 text-left text-sm font-semibold text-gray-600">
                    {column.render('Header')}
                    <span className="ml-1">{column.isSorted ? (column.isSortedDesc ? '↓' : '↑') : ''}</span>
                  </th>
                ))}
                {renderRowActions && <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.length > 0 ? (
              page.map(row => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()} className="hover:bg-gray-50 border-b">
                    {row.cells.map(cell => (
                      <td {...cell.getCellProps()} className="p-3 text-sm text-gray-700">{cell.render('Cell')}</td>
                    ))}
                    {renderRowActions && <td className="p-3 text-sm">{renderRowActions(row.original)}</td>}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (renderRowActions ? 1 : 0)} className="text-center p-6 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex-1 text-sm text-gray-600">
          Showing {page.length} of {data.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => gotoPage(0)} disabled={!canPreviousPage} variant="ghost" size="sm"><ChevronsLeft size={16} /></Button>
          <Button onClick={() => previousPage()} disabled={!canPreviousPage} variant="ghost" size="sm"><ChevronLeft size={16} /></Button>
          <span className="text-sm">
            Page <strong>{pageIndex + 1} of {pageOptions.length}</strong>
          </span>
          <Button onClick={() => nextPage()} disabled={!canNextPage} variant="ghost" size="sm"><ChevronRight size={16} /></Button>
          <Button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage} variant="ghost" size="sm"><ChevronsRight size={16} /></Button>
        </div>
      </div>
    </>
  );
}

export { Table };
