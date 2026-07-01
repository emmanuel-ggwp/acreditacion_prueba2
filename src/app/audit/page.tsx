import AuditLogView from '@/components/audit/AuditLogView';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

export default function AuditPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN]}>
      <div className="container mx-auto p-4 md:p-8">
        <AuditLogView />
      </div>
    </RoleGuard>
  );
}
