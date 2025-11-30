'use client';

import React, { useEffect } from 'react';
import useAwardStore from '@/store/awardStore';
import { Gift, Check, XCircle } from 'lucide-react';
import ParticipantAward from '@/models/ParticipantAward';

interface ParticipantAwardsListProps {
  participantId: string;
}

const ParticipantAwardsList: React.FC<ParticipantAwardsListProps> = ({ participantId }) => {
  const { 
    participantAwards, 
    fetchAwardsForParticipant, 
    deliverAward, 
    cancelAwardAssignment,
    loading 
  } = useAwardStore();

  useEffect(() => {
    fetchAwardsForParticipant(participantId);
  }, [participantId, fetchAwardsForParticipant]);

  const handleDeliver = (participantAwardId: string) => {
    if (window.confirm('Confirm delivery of this award?')) {
      deliverAward(participantAwardId);
    }
  };

  const handleCancel = (participantAwardId: string) => {
    if (window.confirm('Are you sure you want to cancel this award assignment?')) {
      cancelAwardAssignment(participantAwardId);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Assigned Awards</h3>
      {loading && <p>Loading awards...</p>}
      <div className="space-y-3">
        {participantAwards.length > 0 ? (
          participantAwards.map((pa: ParticipantAward) => (
            <div key={pa.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <Gift className={`mr-3 ${pa.deliveredAt ? 'text-green-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="font-medium">{(pa as any).Award.name}</p>
                  <p className={`text-sm ${pa.deliveredAt ? 'text-gray-500' : 'text-yellow-600'}`}>
                    {pa.deliveredAt 
                      ? `Delivered on ${new Date(pa.deliveredAt).toLocaleDateString()}` 
                      : 'Assigned, pending delivery'}
                  </p>
                </div>
              </div>
              {!pa.deliveredAt && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDeliver(pa.id)}
                    className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"
                    title="Mark as Delivered"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => handleCancel(pa.id)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    title="Cancel Assignment"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">No awards assigned to this participant.</p>
        )}
      </div>
    </div>
  );
};

export default ParticipantAwardsList;
