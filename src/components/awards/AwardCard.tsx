'use client';

import React, { useState } from 'react';
import Award from '@/models/Award';
import { Edit, Trash2, Gift } from 'lucide-react';
import useAwardStore from '@/store/awardStore';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';

interface AwardCardProps {
  award: Award;
  onEdit: () => void;
}

const AwardCard: React.FC<AwardCardProps> = ({ award, onEdit }) => {
  const { deleteAward } = useAwardStore();
  const [showDelete, setShowDelete] = useState(false);

  // These would be calculated or fetched
  const assignedCount = 0;
  const deliveredCount = 0;
  const stock = award.quantity - assignedCount;
  const percentageUsed = award.quantity > 0 ? (assignedCount / award.quantity) * 100 : 0;

  const confirmDelete = async (reason: string) => {
    await deleteAward(award.id, reason);
    setShowDelete(false);
  };

  return (
    <>
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-gray-800">{award.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
            <button onClick={() => setShowDelete(true)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1 h-10 overflow-hidden">{award.description}</p>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
            <span>Stock</span>
            <span>{stock} / {award.quantity}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${100 - percentageUsed}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 border-t grid grid-cols-3 divide-x text-center">
        <div>
          <p className="text-xl font-bold">{award.quantity}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div>
          <p className="text-xl font-bold">{assignedCount}</p>
          <p className="text-xs text-gray-500">Asignados</p>
        </div>
        <div>
          <p className="text-xl font-bold">{deliveredCount}</p>
          <p className="text-xs text-gray-500">Entregados</p>
        </div>
      </div>
    </div>
    {showDelete && (
      <DeleteReasonModal
        title="Eliminar premio"
        itemName={award.name}
        onConfirm={confirmDelete}
        onClose={() => setShowDelete(false)}
      />
    )}
    </>
  );
};

export default AwardCard;
