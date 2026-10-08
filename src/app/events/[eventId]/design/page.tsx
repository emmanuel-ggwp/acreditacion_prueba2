import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import EventDesignEditor from '@/components/events/EventDesignEditor';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

// Editor de diseño en vivo de la landing pública del evento (controles + vista previa).
export default async function EventDesignPage({ params }: PageProps) {
  const { eventId } = await params;
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]} fallback={<div className="p-10 text-center text-gray-500">No tienes permiso para editar el diseño.</div>}>
        <EventDesignEditor eventId={eventId} />
      </RoleGuard>
    </ProtectedRoute>
  );
}
