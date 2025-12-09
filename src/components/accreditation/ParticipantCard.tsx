'use client';

import React, { useState, useEffect } from 'react';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import useAccreditationStore from '@/store/accreditationStore';
import useAuthStore from '@/store/authStore';
import { Check, X, User, Users, Award, Mail, FileText } from 'lucide-react';
import AccreditationConfirm from './AccreditationConfirm';

interface ParticipantCardProps {
  person: Participant | Guest;
  type: 'participant' | 'guest';
  scheduleId: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ person, type, scheduleId }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [guestsToAccredit, setGuestsToAccredit] = useState<string[]>([]);
  // This should come from a store/service
  const [accreditationStatus, setAccreditationStatus] = useState<{isAccredited: boolean, details?: any}>({ isAccredited: false });

  const { verifyAccreditation } = useAccreditationStore();

  useEffect(() => {
    const checkStatus = async () => {
      // const status = await verifyAccreditation(type, person.id, scheduleId);
      // setAccreditationStatus(status);
    };
    checkStatus();
    // Reset guest selection when person changes
    setGuestsToAccredit([]);
  }, [person, scheduleId, verifyAccreditation, type]);

  const handleGuestToggle = (guestId: string) => {
    setGuestsToAccredit(prev => 
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    );
  };

  const isParticipant = type === 'participant';
  const participant = isParticipant ? (person as Participant) : null;
  const guest = !isParticipant ? (person as Guest) : null;

  const name = isParticipant ? `${participant?.firstName} ${participant?.lastName}` : `${guest?.firstName} ${guest?.lastName}`;
  const email = isParticipant ? participant?.email : 'N/A';
  const documentNumber = person.documentNumber;

  const handleAccreditationSuccess = () => {
    setIsConfirming(false);
    // Refresh status
    // verifyAccreditation(type, person.id, scheduleId).then(setAccreditationStatus);
  };

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <p className="text-gray-500">{isParticipant ? 'Participant' : 'Guest'}</p>
          </div>
          {accreditationStatus.isAccredited ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1 rounded-full">
              <Check size={20} />
              <span className="font-semibold">Accredited</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
              <X size={20} />
              <span className="font-semibold">Not Accredited</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-lg mb-3">Details</h3>
          <div className="space-y-2 text-gray-700">
            <p className="flex items-center"><Mail size={16} className="mr-2" /> {email}</p>
            <p className="flex items-center"><FileText size={16} className="mr-2" /> {documentNumber || 'Not provided'}</p>
            {isParticipant && <p className="flex items-center"><Users size={16} className="mr-2" /> Allowed Guests: {participant?.allowedGuests}</p>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-3">Awards</h3>
          <div className="space-y-2">
            {/* Placeholder */}
            <p className="text-gray-500 text-sm">No pending awards.</p>
          </div>
        </div>
      </div>

      {isParticipant && participant?.guests && participant.guests.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="font-semibold text-lg mb-3">Guests</h3>
          <div className="space-y-2">
            {participant.guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <span>{g.firstName} {g.lastName}</span>
                <input 
                  type="checkbox"
                  checked={guestsToAccredit.includes(g.id)}
                  onChange={() => handleGuestToggle(g.id)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!accreditationStatus.isAccredited && (
        <div className="p-6 bg-gray-50 border-t text-right">
          <button
            onClick={() => setIsConfirming(true)}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition duration-300 text-lg"
          >
            ACCREDIT
          </button>
        </div>
      )}

      {isConfirming && (
        <AccreditationConfirm
          person={person}
          type={type}
          scheduleId={scheduleId}
          guestsToAccredit={guestsToAccredit}
          onClose={() => setIsConfirming(false)}
          onSuccess={handleAccreditationSuccess}
        />
      )}
    </div>
  );
};

export default ParticipantCard;
