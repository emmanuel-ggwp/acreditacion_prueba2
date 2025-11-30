'use client';

import React, { useState, useEffect } from 'react';
import useParticipantStore from '@/store/participantStore';
import Guest from '@/models/Guest';
import { PlusCircle, Trash2 } from 'lucide-react';
// import GuestForm from './GuestForm'; // Assuming this component exists

interface GuestListProps {
  participantId: string;
  allowedGuests: number;
}

const GuestList: React.FC<GuestListProps> = ({ participantId, allowedGuests }) => {
  // This state would ideally be managed in a dedicated guestStore or within participantStore
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);

  useEffect(() => {
    // Fetch guests for the participant
    // const fetchedGuests = await guestService.getGuestsForParticipant(participantId);
    // setGuests(fetchedGuests);
  }, [participantId]);

  const canAddGuest = guests.length < allowedGuests;

  const handleAddGuest = () => {
    setShowGuestForm(true);
  };

  const handleDeleteGuest = (guestId: string) => {
    // await guestService.deleteGuest(guestId);
    // setGuests(guests.filter(g => g.id !== guestId));
    console.log(`Delete guest ${guestId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-700">Guests ({guests.length}/{allowedGuests})</h3>
        {canAddGuest && (
          <button
            onClick={handleAddGuest}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm"
          >
            <PlusCircle size={18} />
            Add Guest
          </button>
        )}
      </div>

      {showGuestForm && (
        <div className="mb-4">
          {/* <GuestForm participantId={participantId} onGuestAdded={() => setShowGuestForm(false)} /> */}
          <p>Guest form will be here.</p>
        </div>
      )}

      <div className="space-y-3">
        {guests.length > 0 ? (
          guests.map(guest => (
            <div key={guest.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{`${guest.firstName} ${guest.lastName}`}</p>
                <p className="text-sm text-gray-500">{guest.documentNumber}</p>
              </div>
              <button 
                onClick={() => handleDeleteGuest(guest.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No guests have been added yet.</p>
        )}
      </div>
    </div>
  );
};

export default GuestList;
