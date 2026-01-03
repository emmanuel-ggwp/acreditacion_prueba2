'use client';

import React, { useState } from 'react';
import useAccreditationStore from '@/store/accreditationStore';
import useAuthStore from '@/store/authStore';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import { Loader2 } from 'lucide-react';

interface AccreditationConfirmProps {
  person: Participant | Guest;
  type: 'participant' | 'guest';
  scheduleId: string;
  guestsToAccredit: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const AccreditationConfirm: React.FC<AccreditationConfirmProps> = ({
  person,
  type,
  scheduleId,
  guestsToAccredit,
  onClose,
  onSuccess,
}) => {
  const { accreditParticipant, accreditGuest, loading, error } = useAccreditationStore();
  const { user } = useAuthStore();
  const [notes, setNotes] = useState('');
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>(guestsToAccredit);

  const handleConfirm = async () => {
    if (!user) {
      alert('You must be logged in to accredit.');
      return;
    }

    try {
      if (type === 'participant') {
        await accreditParticipant(person.id, scheduleId, user.id, notes);
        // Also accredit selected guests
        for (const guestId of selectedGuestIds) {
          await accreditGuest(guestId, scheduleId, user.id, notes);
        }
      } else {
        await accreditGuest(person.id, scheduleId, user.id, notes);
      }
      onSuccess();
    } catch (e) {
      // Error is handled in the store, but we could show a toast here
      console.error(e);
    }
  };

  const handleGuestToggle = (guestId: string) => {
    setSelectedGuestIds(prev => 
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    );
  };

  const name = 'firstName' in person ? `${person.firstName} ${person.lastName}` : 'Guest';
  const participant = type === 'participant' ? (person as Participant) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Confirm Accreditation</h2>
        <p className="mb-2">You are about to accredit:</p>
        <p className="font-semibold text-xl mb-4">{name}</p>
        
        {participant && participant.guests && participant.guests.length > 0 && (
          <div className="mb-6">
            <p className="font-semibold mb-2">Guests to Accredit:</p>
            <div className="bg-gray-50 rounded-md p-2 max-h-40 overflow-y-auto border border-gray-200">
              {participant.guests.map(guest => (
                <div key={guest.id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                  <span className="text-sm">{guest.firstName} {guest.lastName}</span>
                  <input 
                    type="checkbox"
                    checked={selectedGuestIds.includes(guest.id)}
                    onChange={() => handleGuestToggle(guest.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {selectedGuestIds.length} guest(s) selected
            </p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccreditationConfirm;
