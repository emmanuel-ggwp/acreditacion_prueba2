'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';

// This is a simplified example. In a real app, you'd pass data or callbacks.
const ExportButton: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setIsLoading(format);
    console.log(`Exporting ${format} for event ${eventId}`);

    // Simulate async export process
    setTimeout(() => {
      // Mock data for export
      const data = [
        { id: 1, name: 'John Doe', status: 'Accredited' },
        { id: 2, name: 'Jane Smith', status: 'Pending' },
      ];
      const headers = [['Name', 'Status']];
      const body = data.map(d => [d.name, d.status]);

      if (format === 'csv' || format === 'excel') {
        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Report");
        const extension = format === 'csv' ? 'csv' : 'xlsx';
        writeFile(wb, `Report_${eventId}.${extension}`);
      }

      if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Event Report - ${eventId}`, 14, 16);
        (doc as any).autoTable({
          head: headers,
          body: body,
          startY: 20,
        });
        doc.save(`Report_${eventId}.pdf`);
      }

      setIsLoading(null);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
          <Download className="mr-2 -ml-1 h-5 w-5" />
          Export
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <a href="#" onClick={() => handleExport('csv')} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              {isLoading === 'csv' ? 'Generating...' : <><FileText className="mr-3 h-5 w-5" /> Export as CSV</>}
            </a>
            <a href="#" onClick={() => handleExport('excel')} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              {isLoading === 'excel' ? 'Generating...' : <><FileSpreadsheet className="mr-3 h-5 w-5" /> Export as Excel</>}
            </a>
            <a href="#" onClick={() => handleExport('pdf')} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              {isLoading === 'pdf' ? 'Generating...' : <><FileType className="mr-3 h-5 w-5" /> Export as PDF</>}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
