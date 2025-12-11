import EventReport from '@/components/reports/EventReport';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventReportsPage({ params }: PageProps) {
  const { eventId } = await params;
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
      <EventReport eventId={eventId} />
    </RoleGuard>
  );
}
