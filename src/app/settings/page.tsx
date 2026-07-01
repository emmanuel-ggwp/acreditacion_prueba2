import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';
import EmailTemplateManager from '@/components/settings/EmailTemplateManager';

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN]}>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Configuración</h1>
        <EmailTemplateManager />
      </div>
    </RoleGuard>
  );
}
