'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import useParticipantStore from '@/store/participantStore';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface ParticipantImportProps {
  eventId: string;
  onClose: () => void;
}

const ParticipantImport: React.FC<ParticipantImportProps> = ({ eventId, onClose }) => {
  const { uploadParticipants, loading, error } = useParticipantStore();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data);
        },
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (file) {
      try {
        await uploadParticipants(eventId, file);
        onClose();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setParsedData([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Import Participants</h2>

        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive ? 'Drop the file here...' : 'Drag & drop a CSV file here, or click to select a file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">CSV up to 10MB</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-gray-500" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <button onClick={removeFile} className="text-gray-500 hover:text-red-600">
                <X size={20} />
              </button>
            </div>
            {parsedData.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium">Preview ({parsedData.length} records)</h3>
                <div className="max-h-60 overflow-auto mt-2 border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(parsedData[0]).map(key => (
                          <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value: any, j: number) => (
                            <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            disabled={!file || loading}
          >
            {loading ? 'Importing...' : 'Import and Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantImport;
