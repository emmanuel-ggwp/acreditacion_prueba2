import { Op } from 'sequelize';
import { User } from '@/models/index';
import { auditLogService } from './auditLogService';

const PUBLIC_ATTRS = ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLogin', 'createdAt'];
const VALID_ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'GUARDIA'];

function sanitize(u: any) {
  const p = u && u.get ? u.get({ plain: true }) : u;
  if (p) delete p.password;
  return p;
}

export class UserService {
  async list() {
    return User.findAll({ attributes: PUBLIC_ATTRS, order: [['createdAt', 'ASC']] });
  }

  async create(data: any, actorId?: string) {
    const { username, email, password, firstName, lastName, role } = data;
    if (!username?.trim() || !email?.trim() || !password) {
      throw new Error('Usuario, correo y contraseña son obligatorios.');
    }
    if (String(password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (role && !VALID_ROLES.includes(role)) throw new Error('Rol inválido.');

    const exists = await User.findOne({ where: { [Op.or]: [{ email }, { username }] }, paranoid: false });
    if (exists) throw new Error('Ya existe un usuario con ese correo o nombre de usuario.');

    const user = await User.create({
      username: username.trim(),
      email: email.trim(),
      password,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || 'GUARDIA',
      isActive: true,
    } as any);

    if (actorId) {
      await auditLogService.log({ userId: actorId, action: 'CREATE', entity: 'User', entityId: user.id, details: { name: (user as any).username, role: (user as any).role } });
    }
    return sanitize(user);
  }

  async update(id: string, data: any, actorId?: string) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado.');

    if (actorId && actorId === id && data.isActive === false) {
      throw new Error('No puedes desactivar tu propia cuenta.');
    }
    if (data.role && !VALID_ROLES.includes(data.role)) throw new Error('Rol inválido.');
    if (data.password && String(data.password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

    const before: any = { email: (user as any).email, firstName: (user as any).firstName, lastName: (user as any).lastName, role: (user as any).role, isActive: (user as any).isActive };
    const patch: any = {};
    if (data.email && data.email.trim() && data.email.trim() !== (user as any).email) {
      const dup = await User.findOne({ where: { email: data.email.trim() }, paranoid: false });
      if (dup && (dup as any).id !== id) throw new Error('Ya existe un usuario con ese correo.');
      patch.email = data.email.trim();
    }
    if (data.firstName !== undefined) patch.firstName = data.firstName;
    if (data.lastName !== undefined) patch.lastName = data.lastName;
    if (data.role !== undefined) patch.role = data.role;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.password) patch.password = data.password; // el hook lo hashea

    await user.update(patch);

    if (actorId) {
      const changes: Record<string, { from: any; to: any }> = {};
      for (const k of ['email', 'firstName', 'lastName', 'role', 'isActive']) {
        if (k in patch && before[k] !== patch[k]) changes[k] = { from: before[k] ?? null, to: patch[k] ?? null };
      }
      if (data.password) (changes as any)['password'] = { from: '••••', to: '(restablecida)' };
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: user.id, details: { name: (user as any).username, changes } });
      }
    }
    return sanitize(user);
  }

  async remove(id: string, actorId?: string, reason?: string) {
    if (actorId && actorId === id) throw new Error('No puedes eliminar tu propia cuenta.');
    const user = await User.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado.');
    const name = (user as any).username;
    await user.destroy(); // soft delete (paranoid)
    if (actorId) {
      await auditLogService.log({ userId: actorId, action: 'DELETE', entity: 'User', entityId: id, details: { name, reason: reason || null } });
    }
    return { ok: true };
  }
}

export const userService = new UserService();
