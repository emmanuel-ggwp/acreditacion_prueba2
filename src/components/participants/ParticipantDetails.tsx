'use client';

import React, { useEffect } from 'react';
import useParticipantStore from '@/store/participantStore';
import useAccreditationStore from '@/store/accreditationStore';
import { useRouter } from 'next/navigation';
import { User, Mail, FileText, Users, Award, Calendar, CheckCircle } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import GuestList from './GuestList';
// import AwardList from '../awards/AwardList'; // Assuming this component exists

const ParticipantDetails = ({ participantId }: { participantId:string }) => {
  const router = useRouter();
  const { currentParticipant, fetchParticipantById, loading, error } = useParticipantStore();
  const { accreditParticipant, loading: accreditationLoading, error: accreditationError } = useAccreditationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchParticipantById(participantId);
  }, [participantId, fetchParticipantById]);

  const handleAccredit = async () => {
    if (currentParticipant && user) {
      // This is a placeholder. In a real app, you'd have a UI to select the schedule.
      const eventScheduleId = '...'; // You need to get this from the event's schedules
      await accreditParticipant(currentParticipant.id, eventScheduleId, user.id);
      // Optionally refresh participant data to show accreditation status
      fetchParticipantById(participantId);
    }
  };

  if (loading) return <div className="text-center p-4">Loading participant details...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  if (!currentParticipant) return <div className="text-center p-4">Participant not found.</div>;

  // This is a temporary fix. The backend should provide this information.
  const isAccredited = (currentParticipant as any).accredited;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{`${currentParticipant.firstName} ${currentParticipant.lastName}`}</h1>
              <p className="text-md text-gray-500">{currentParticipant.company}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                isAccredited ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isAccredited ? 'Accredited' : 'Pending Accreditation'}
              </span>
              {!isAccredited && (
                <button
                  onClick={handleAccredit}
                  disabled={accreditationLoading}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-green-300 flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  {accreditationLoading ? 'Accrediting...' : 'Accredit'}
                </button>
              )}
            </div>
          </div>
          {accreditationError && <p className="mt-2 text-sm text-red-600">{accreditationError}</p>}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Details</h3>
              <div className="flex items-center text-gray-600">
                <Mail size={20} className="mr-3 text-indigo-500" />
                <span>{currentParticipant.email}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FileText size={20} className="mr-3 text-indigo-500" />
                <span>{currentParticipant.documentNumber}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users size={20} className="mr-3 text-indigo-500" />
                <span>{`Allowed Guests: ${currentParticipant.allowedGuests}`}</span>
              </div>
               <div className="flex items-center text-gray-600">
                <Calendar size={20} className="mr-3 text-indigo-500" />
                <span>{`Registered on: ${new Date(currentParticipant.createdAt).toLocaleDateString()}`}</span>
              </div>
            </div>
            
            <div>
              {/* Placeholder for Awards */}
              <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Awards</h3>
              {/* <AwardList participantId={participantId} /> */}
              <p className="text-gray-500">Awards section coming soon.</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <GuestList participantId={participantId} allowedGuests={currentParticipant.allowedGuests} />
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetails;

