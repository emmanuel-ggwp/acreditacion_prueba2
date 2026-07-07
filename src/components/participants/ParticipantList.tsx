'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import useAuthStore from '@/store/authStore';
import { PlusCircle, FileDown, FileUp, Edit, Trash2, Award, X, CheckCircle2, Clock } from 'lucide-react';
import ParticipantSearch from './ParticipantSearch';
import Participant from '@/models/Participant';
import ParticipantForm from './ParticipantForm';
import ParticipantImport from './ParticipantImport';
import { showToast } from '@/components/ui/Toast';
import { exportParticipantsToExcel } from '@/utils/exportParticipants';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';
import { getGuestMode } from '@/utils/formFields';
import { getDietaryOptions } from '@/utils/dietary';

const fmtAccreditedAt = (d?: string | null) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
};

const ParticipantList = ({ eventId }: { eventId: string }) => {
  const router = useRouter();
  const { 
    participants, 
    loading, 
    error, 
    total,
    fetchParticipantsByEvent,
    setCurrentParticipant,
    deleteParticipant,
    updateParticipant
  } = useParticipantStore();
  const { currentEvent } = useEventStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('');
  const [showOnlyAwarded, setShowOnlyAwarded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | undefined>(undefined);
  const [awarding, setAwarding] = useState<any | null>(null);
  const [awardReasonInput, setAwardReasonInput] = useState('');
  const [savingAward, setSavingAward] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportParticipantsToExcel(eventId, (currentEvent as any)?.name || 'evento');
      showToast.success('Excel generado');
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  const isEventFull = useMemo(() => {
    if (!currentEvent?.maxCapacity) return false;
    return total >= currentEvent.maxCapacity;
  }, [currentEvent, total]);

  useEffect(() => {
    fetchParticipantsByEvent(eventId);
  }, [eventId, fetchParticipantsByEvent]);

  const handleSelectParticipant = (participant: Participant) => {
    setCurrentParticipant(participant);
    // router.push(`/participants/${participant.id}`);
    handleEdit(participant);
  };

  const handleEdit = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const p = participants.find((x) => x.id === id) || null;
    setDeleteTarget(p);
  };
  const confirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    await deleteParticipant(deleteTarget.id, reason);
    setDeleteTarget(null);
    fetchParticipantsByEvent(eventId);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedParticipant(undefined);
    fetchParticipantsByEvent(eventId);
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p =>
      (
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
        p.email.toLowerCase().includes(filter.toLowerCase()) ||
        (p.documentNumber && p.documentNumber.toLowerCase().includes(filter.toLowerCase()))
      ) && (!showOnlyAwarded || (p as any).isAwarded)
    );
  }, [participants, filter, showOnlyAwarded]);

  const openAward = (p: any) => { setAwarding(p); setAwardReasonInput(p.awardReason || ''); };

  const saveAward = async (awarded: boolean) => {
    if (!awarding) return;
    setSavingAward(true);
    try {
      await updateParticipant(awarding.id, { isAwarded: awarded, awardReason: awarded ? (awardReasonInput.trim() || null) : null } as any);
      showToast.success(awarded ? 'Participante premiado' : 'Premiación quitada');
      setAwarding(null);
      fetchParticipantsByEvent(eventId);
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo guardar la premiación');
    } finally {
      setSavingAward(false);
    }
  };

  if (loading && participants.length === 0) return <div className="p-4 text-center">Cargando participantes...</div>;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {error && !isFormOpen && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Participantes
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setSelectedParticipant(undefined); setIsFormOpen(true); }}
            disabled={isEventFull}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              isEventFull 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title={isEventFull ? 'Capacidad del evento alcanzada' : 'Agregar nuevo participante'}
          >
            <PlusCircle size={18} />
            Nuevo participante
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="border px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            title="Importar participantes desde Excel/CSV"
          >
            <FileUp size={18} />
            Importar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            title="Exportar a Excel (participantes + invitados + fechas)"
          >
            <FileDown size={18} />
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1"><ParticipantSearch eventId={eventId} onSelect={handleSelectParticipant} /></div>
        <button
          type="button"
          onClick={() => setShowOnlyAwarded((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 whitespace-nowrap ${showOnlyAwarded ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Award size={16} /> {showOnlyAwarded ? 'Mostrando premiados' : 'Solo premiados'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora acreditación</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premiado</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{`${participant.firstName} ${participant.lastName}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.documentNumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(participant as any).registered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" title="El participante ya se inscribió (tiene fecha)">
                        <CheckCircle2 size={12} /> Inscrito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title="Precargado: aún no se inscribe. Solo tiene acceso al formulario con su RUT.">
                        <Clock size={12} /> Precargado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fmtAccreditedAt((participant as any).accreditedAt) || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(participant as any).isAwarded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title={(participant as any).awardReason || ''}>
                        <Award size={12} /> Premiado
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openAward(participant as any)}
                        className={`p-1 rounded hover:bg-amber-50 ${(participant as any).isAwarded ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
                        title="Premiación"
                      >
                        <Award size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(participant as any)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(participant.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  No se encontraron participantes. Agrega uno para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ParticipantForm
          eventId={eventId}
          participant={selectedParticipant}
          onClose={handleCloseForm}
        />
      )}

      {isImportOpen && (
        <ParticipantImport
          eventId={eventId}
          guestMode={getGuestMode((currentEvent as any)?.registrationConfig)}
          dietaryOptions={getDietaryOptions((currentEvent as any)?.registrationConfig).filter((o) => o.value !== 'NONE').map((o) => o.label)}
          onClose={() => setIsImportOpen(false)}
          onImported={() => fetchParticipantsByEvent(eventId)}
        />
      )}

      {deleteTarget && (
        <DeleteReasonModal
          title="Eliminar participante"
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {awarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2"><Award size={18} className="text-amber-600" /> Premiación</h3>
              <button onClick={() => setAwarding(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 mb-3"><b>{awarding.firstName} {awarding.lastName}</b></p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea value={awardReasonInput} onChange={(e) => setAwardReasonInput(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Ej. Mejor disfraz, sorteo, reconocimiento…" />
            </div>
            <div className="flex justify-between gap-2 px-5 py-4 border-t bg-gray-50">
              {awarding.isAwarded ? (
                <button onClick={() => saveAward(false)} disabled={savingAward} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50">Quitar premiación</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setAwarding(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100">Cancelar</button>
                <button onClick={() => saveAward(true)} disabled={savingAward} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50">{awarding.isAwarded ? 'Actualizar motivo' : 'Premiar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantList;
