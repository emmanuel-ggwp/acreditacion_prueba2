import DashboardStats from '@/components/dashboard/DashboardStats';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.GUARD]}>
      <div className="container mx-auto p-4 md:p-8">
        <DashboardStats />
      </div>
    </RoleGuard>
  );
}
