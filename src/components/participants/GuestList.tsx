'use client';

import React, { useState, useEffect } from 'react';
import Guest from '@/models/Guest';
import { PlusCircle, Trash2 } from 'lucide-react';
import useGuestStore from '@/store/guestStore';
import GuestForm from './GuestForm';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';
import { DietOption, dietaryLabel } from '@/utils/dietary';

interface GuestListProps {
  participantId: string;
  allowedGuests: number;
  guestDietary?: boolean;
  dietaryOptions?: DietOption[];
}

const GuestList: React.FC<GuestListProps> = ({ participantId, allowedGuests, guestDietary, dietaryOptions }) => {
  const { guests, loading, error, fetchGuests, deleteGuest } = useGuestStore();
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);

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

  const confirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    try {
      await deleteGuest(deleteTarget.id, reason);
      setDeleteTarget(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar el invitado (puede estar acreditado).');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-700">Invitados ({guests.length}/{allowedGuests})</h3>
        {canAddGuest && !editingGuest && (
          <button
            onClick={handleAddGuest}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm"
          >
            <PlusCircle size={18} />
            Agregar invitado
          </button>
        )}
      </div>

      {(showGuestForm || editingGuest) && (
        <div className="mb-4">
          <GuestForm
            participantId={participantId}
            guestDietary={guestDietary}
            dietaryOptions={dietaryOptions}
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
        {loading && <p className="text-gray-500">Cargando invitados...</p>}
        {!loading && guests.length > 0 ? (
          guests.map(guest => (
            <div key={guest.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {`${guest.firstName} ${guest.lastName || ''}`}
                  {(guest as any).guestType && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {(guest as any).guestType === 'CARGA' ? 'Carga' : (guest as any).guestType === 'ACOMPANANTE' ? 'Acompañante' : (guest as any).guestType}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {guest.documentNumber || 'Sin documento'}
                  {guestDietary && (guest as any).dietaryPreference && (guest as any).dietaryPreference !== 'NONE' && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{dietaryLabel((guest as any).dietaryPreference)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingGuest(guest)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                  disabled={loading}
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteTarget(guest)}
                  className="text-red-500 hover:text-red-700"
                  disabled={loading}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : !loading ? (
          <p className="text-gray-500">Aún no se han agregado invitados.</p>
        ) : null}
      </div>

      {deleteTarget && (
        <DeleteReasonModal
          title="Eliminar invitado"
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName || ''}`.trim()}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default GuestList;
