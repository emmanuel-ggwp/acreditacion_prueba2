import GiftsModule from '@/components/gifts/GiftsModule';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

export default function GiftsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD]}>
      <div className="container mx-auto p-4 md:p-8">
        <GiftsModule />
      </div>
    </RoleGuard>
  );
}
