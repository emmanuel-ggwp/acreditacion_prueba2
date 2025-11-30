'use client';

import React, { useState } from 'react';
import useAwardStore from '@/store/awardStore';
import ParticipantSearch from '@/components/participants/ParticipantSearch';
import Participant from '@/models/Participant';
import ParticipantAward from '@/models/ParticipantAward';
import { Check, Gift, Loader2 } from 'lucide-react';

const AwardDelivery = ({ eventId }: { eventId: string }) => {
  const { 
    participantAwards, 
    fetchAwardsForParticipant, 
    deliverAward, 
    loading 
  } = useAwardStore();
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [awardsToDeliver, setAwardsToDeliver] = useState<string[]>([]);

  const handleParticipantSelect = (participant: Participant) => {
    setSelectedParticipant(participant);
    fetchAwardsForParticipant(participant.id);
    setAwardsToDeliver([]);
  };

  const handleToggleAward = (awardId: string) => {
    setAwardsToDeliver(prev => 
      prev.includes(awardId) ? prev.filter(id => id !== awardId) : [...prev, awardId]
    );
  };

  const handleConfirmDelivery = async () => {
    if (window.confirm(`Confirm delivery of ${awardsToDeliver.length} award(s)?`)) {
      for (const awardId of awardsToDeliver) {
        await deliverAward(awardId);
      }
      // Refresh
      if (selectedParticipant) {
        fetchAwardsForParticipant(selectedParticipant.id);
      }
      setAwardsToDeliver([]);
    }
  };

  const pendingAwards = participantAwards.filter((pa: ParticipantAward) => !pa.deliveredAt);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Award Delivery</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search Participant</label>
        <ParticipantSearch eventId={eventId} onSelect={(p) => handleParticipantSelect(p as Participant)} />
      </div>

      {selectedParticipant && (
        <div>
          <h3 className="text-xl font-semibold mb-3">
            Pending Awards for {selectedParticipant.firstName} {selectedParticipant.lastName}
          </h3>
          {loading && !pendingAwards.length && <p>Loading...</p>}
          <div className="space-y-2">
            {pendingAwards.length > 0 ? (
              pendingAwards.map((pa: ParticipantAward) => (
                <div key={pa.id} className="p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Gift className="mr-3 text-blue-500" />
                    <p className="font-medium">{(pa as any).Award.name}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={awardsToDeliver.includes(pa.id)}
                    onChange={() => handleToggleAward(pa.id)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              ))
            ) : (
              <p className="text-gray-500">No pending awards for this participant.</p>
            )}
          </div>

          {awardsToDeliver.length > 0 && (
            <div className="mt-6 text-right">
              <button
                onClick={handleConfirmDelivery}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center ml-auto"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                Confirm Delivery ({awardsToDeliver.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AwardDelivery;
