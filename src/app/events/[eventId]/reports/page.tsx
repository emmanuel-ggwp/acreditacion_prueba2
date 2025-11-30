import EventReport from '@/components/reports/EventReport';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

interface PageProps {
  params: { eventId: string };
}

export default function EventReportsPage({ params }: PageProps) {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
      <EventReport eventId={params.eventId} />
    </RoleGuard>
  );
}
