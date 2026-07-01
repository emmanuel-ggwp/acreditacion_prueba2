'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  title?: string;
  itemName?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}

const DeleteReasonModal: React.FC<Props> = ({ title = 'Eliminar', itemName, description, confirmLabel = 'Eliminar', onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} /> {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-3">
            {description || (
              <>Vas a eliminar {itemName ? <b>{itemName}</b> : 'este registro'}. Esta acción quedará registrada. Indica el motivo:</>
            )}
          </p>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Motivo de la eliminación (obligatorio)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim() || submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Eliminando…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteReasonModal;
