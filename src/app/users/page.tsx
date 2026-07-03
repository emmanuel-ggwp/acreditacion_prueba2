import UserManager from '@/components/users/UserManager';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

export default function UsersPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN]}>
      <div className="container mx-auto p-4 md:p-8">
        <UserManager />
      </div>
    </RoleGuard>
  );
}
