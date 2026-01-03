'use client';

import React, { useState, useEffect } from 'react';
import Guest from '@/models/Guest';
import { PlusCircle, Trash2 } from 'lucide-react';
import useGuestStore from '@/store/guestStore';
import GuestForm from './GuestForm';

interface GuestListProps {
  participantId: string;
  allowedGuests: number;
}

const GuestList: React.FC<GuestListProps> = ({ participantId, allowedGuests }) => {
  const { guests, loading, error, fetchGuests, deleteGuest } = useGuestStore();
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  useEffect(() => {
    if (participantId) {
      fetchGuests(participantId);
    }
  }, [participantId, fetchGuests]);

  const canAddGuest = guests.length < allowedGuests;

  const handleAddGuest = () => {
    if (!canAddGuest) return;
    setShowGuestForm(true);
  };

  const handleDeleteGuest = async (guestId: string) => {
    try {
      await deleteGuest(guestId);
    } catch (e: any) {
      alert(e?.message || 'Unable to delete guest (maybe accredited).');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-700">Guests ({guests.length}/{allowedGuests})</h3>
        {canAddGuest && !editingGuest && (
          <button
            onClick={handleAddGuest}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm"
          >
            <PlusCircle size={18} />
            Add Guest
          </button>
        )}
      </div>

      {(showGuestForm || editingGuest) && (
        <div className="mb-4">
          <GuestForm
            participantId={participantId}
            guest={editingGuest || undefined}
            onSaved={() => {
              setShowGuestForm(false);
              setEditingGuest(null);
              fetchGuests(participantId);
            }}
            onCancel={() => {
              setShowGuestForm(false);
              setEditingGuest(null);
            }}
          />
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="space-y-3">
        {loading && <p className="text-gray-500">Loading guests...</p>}
        {!loading && guests.length > 0 ? (
          guests.map(guest => (
            <div key={guest.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{`${guest.firstName} ${guest.lastName}`}</p>
                <p className="text-sm text-gray-500">{guest.documentNumber || 'No document'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingGuest(guest)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                  disabled={loading}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteGuest(guest.id)}
                  className="text-red-500 hover:text-red-700"
                  disabled={loading}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : !loading ? (
          <p className="text-gray-500">No guests have been added yet.</p>
        ) : null}
      </div>
    </div>
  );
};

export default GuestList;
