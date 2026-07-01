import RealtimeStats from '@/components/reports/RealtimeStats';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

export default function GlobalReportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]}>
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Monitor de Eventos en Vivo</h1>
            <RealtimeStats />
        </div>
    </RoleGuard>
  );
}
