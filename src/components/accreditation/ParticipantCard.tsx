'use client';

import React, { useState, useEffect } from 'react';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import useAccreditationStore from '@/store/accreditationStore';
import useAuthStore from '@/store/authStore';
import { Check, X, User, Users, Award, Mail, FileText, Loader2, CalendarClock, Utensils } from 'lucide-react';
import { dietaryFull, dietaryLabel } from '@/utils/dietary';

interface ParticipantCardProps {
  person: Participant | Guest;
  type: 'participant' | 'guest';
  scheduleId: string;
  scheduleLabel?: string;
  onAccredited?: () => void;
}

const fmtScheduleDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' }); } catch { return ''; }
};

const ParticipantCard: React.FC<ParticipantCardProps> = ({ person, type, scheduleId, scheduleLabel, onAccredited }) => {
  const [guestsToAccredit, setGuestsToAccredit] = useState<string[]>([]);
  const [accreditationStatus, setAccreditationStatus] = useState<{isAccredited: boolean, accreditation?: any}>({ isAccredited: false });
  const [notes, setNotes] = useState('');

  const { verifyAccreditation, accreditParticipant, accreditGuest, loading } = useAccreditationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const checkStatus = async () => {
      if (person && scheduleId) {
        const status = await verifyAccreditation(type, person.id, scheduleId);
        setAccreditationStatus(status);
      }
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

  // Aviso: el participante se inscribió en otra(s) fecha(s) distinta(s) a la que se está acreditando.
  const registeredSchedules: any[] = isParticipant ? ((participant as any)?.schedules || []) : [];
  const registeredHere = registeredSchedules.some((s) => s.id === scheduleId);
  const showOtherDateWarning = isParticipant && registeredSchedules.length > 0 && !registeredHere;
  const otherDatesText = registeredSchedules
    .map((s) => `${s.scheduleName || s.label || 'Fecha'}${s.startDateTime ? ` (${fmtScheduleDate(s.startDateTime)})` : ''}`)
    .join(', ');

  // Requerimiento alimentario de la persona (para mostrarlo al acreditar).
  const dietaryText = dietaryFull((person as any).dietaryPreference, (person as any).dietaryComments);
  const hasDietary = !!dietaryText && dietaryText !== 'Ninguna';

  const handleAccredit = async () => {
    if (!user) {
      alert('Debes iniciar sesión para acreditar.');
      return;
    }

    try {
      if (type === 'participant') {
        await accreditParticipant(person.id, scheduleId, user.id, notes);
        // Also accredit selected guests
        for (const guestId of guestsToAccredit) {
          await accreditGuest(guestId, scheduleId, user.id, notes);
        }
      } else {
        await accreditGuest(person.id, scheduleId, user.id, notes);
      }
      
      // Refresh status
      const status = await verifyAccreditation(type, person.id, scheduleId);
      setAccreditationStatus(status);
      setNotes('');
      setGuestsToAccredit([]);
      onAccredited?.();
    } catch (e) {
      console.error(e);
      alert('Error al acreditar: ' + (e as Error).message);
    }
  };

  const handleSelectAllGuests = () => {
    if (isParticipant && participant?.guests) {
      if (guestsToAccredit.length === participant.guests.length) {
        setGuestsToAccredit([]);
      } else {
        setGuestsToAccredit(participant.guests.map(g => g.id));
      }
    }
  };

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold break-words">{name}</h2>
            <p className="text-gray-500">{isParticipant ? 'Participante' : 'Invitado'}</p>
            {isParticipant && (participant as any)?.isAwarded && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Award size={12} /> Premiado
              </span>
            )}
          </div>
          {accreditationStatus.isAccredited ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1 rounded-full">
                <Check size={20} />
                <span className="font-semibold">Acreditado</span>
              </div>
              {accreditationStatus.accreditation?.notes && (
                <p className="text-xs text-gray-500 mt-1 italic max-w-xs text-right">"{accreditationStatus.accreditation.notes}"</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
              <X size={20} />
              <span className="font-semibold">No Acreditado</span>
            </div>
          )}
        </div>
      </div>
      
      {showOtherDateWarning && !accreditationStatus.isAccredited && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <CalendarClock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Se inscribió en otra fecha</p>
            <p className="mt-0.5">
              {name.trim()} se inscribió para <span className="font-medium">{otherDatesText}</span>
              {scheduleLabel ? <>, no para <span className="font-medium">{scheduleLabel}</span></> : null}.
              ¿Deseas acreditarla en esta fecha de todos modos?
            </p>
          </div>
        </div>
      )}

      {hasDietary && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <Utensils className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold">Requerimiento alimentario</p>
            <p className="mt-0.5">{dietaryText}</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-lg mb-3">Detalles</h3>
          <div className="space-y-2 text-gray-700">
            <p className="flex items-center"><Mail size={16} className="mr-2" /> {email}</p>
            <p className="flex items-center"><FileText size={16} className="mr-2" /> {documentNumber || 'No proporcionado'}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-3">Premiación</h3>
          {isParticipant && (participant as any)?.isAwarded ? (
            <div className="flex items-start gap-2">
              <Award className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="inline-flex items-center text-sm font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Premiado</span>
                {(participant as any).awardReason && (
                  <p className="text-sm text-gray-600 mt-1 italic">&quot;{(participant as any).awardReason}&quot;</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sin premio.</p>
          )}
        </div>
      </div>

      {isParticipant && participant?.guests && participant.guests.length > 0 && (
        <div className="p-4 sm:p-6 border-t">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Invitados</h3>
            {!accreditationStatus.isAccredited && (
              <button 
                onClick={handleSelectAllGuests}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {guestsToAccredit.length === participant.guests.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {participant.guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md gap-2">
                <div className="min-w-0">
                  <span className="block truncate">{g.firstName} {g.lastName}</span>
                  {(g as any).dietaryPreference && dietaryLabel((g as any).dietaryPreference) !== 'Ninguna' && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-orange-700">
                      <Utensils size={11} /> {dietaryLabel((g as any).dietaryPreference)}
                    </span>
                  )}
                </div>
                {!accreditationStatus.isAccredited && (
                  <input 
                    type="checkbox"
                    checked={guestsToAccredit.includes(g.id)}
                    onChange={() => handleGuestToggle(g.id)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!accreditationStatus.isAccredited && (
        <div className="p-4 sm:p-6 bg-gray-50 border-t">
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Agrega aquí cualquier nota relevante..."
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAccredit}
              disabled={loading}
              className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-6 sm:px-8 rounded-lg hover:bg-indigo-700 transition duration-300 text-base sm:text-lg flex items-center justify-center disabled:bg-indigo-400"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              ACREDITAR {guestsToAccredit.length > 0 ? `(+ ${guestsToAccredit.length} Invitados)` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantCard;
