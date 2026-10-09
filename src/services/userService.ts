/**
 * Servicio de gestión de usuarios (User).
 *
 * Cubre el CRUD administrativo de usuarios del sistema. Reglas de negocio clave:
 * - Aplica una política de contraseñas ÚNICA (D2.6/SB-31) al crear y al
 *   restablecer contraseña, mediante `passwordError`.
 * - Normaliza el email a su forma canónica (`normalizeEmail`) para comparar
 *   duplicados contra la misma forma que guarda el hook del modelo (R2-03c).
 * - Registra en auditoría las altas, cambios y bajas cuando se recibe `actorId`.
 * - Nunca expone el hash de contraseña: las respuestas se pasan por `sanitize`.
 */
import { Op } from 'sequelize';
import { User } from '@/models/index';
import { auditLogService } from './auditLogService';
import { normalizeEmail } from '@/utils/email';
import { passwordError } from '@/utils/validators/authSchemas';

/** Atributos públicos expuestos al listar usuarios (excluye el hash de contraseña). */
const PUBLIC_ATTRS = ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLogin', 'createdAt'];
/** Roles válidos aceptados al crear o actualizar un usuario. */
const VALID_ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'GUARDIA'];

/**
 * Devuelve una copia plana del usuario sin el campo `password`.
 *
 * @param u - Instancia de modelo Sequelize u objeto plano de usuario.
 * @returns Objeto plano del usuario con la propiedad `password` eliminada (o el valor recibido si es nulo).
 */
function sanitize(u: any) {
  const p = u && u.get ? u.get({ plain: true }) : u;
  if (p) delete p.password;
  return p;
}

/**
 * Encapsula las operaciones administrativas sobre usuarios y su auditoría.
 */
export class UserService {
  /**
   * Lista todos los usuarios con solo sus atributos públicos.
   *
   * @returns Promesa que resuelve al arreglo de usuarios (`User[]`) con `PUBLIC_ATTRS`, ordenado por `createdAt` ascendente. No incluye el hash de contraseña.
   */
  async list() {
    return User.findAll({ attributes: PUBLIC_ATTRS, order: [['createdAt', 'ASC']] });
  }

  /**
   * Crea un usuario nuevo aplicando la política de contraseñas y el control de duplicados.
   *
   * Exige usuario, correo y contraseña; valida la contraseña con `passwordError`
   * (política única D2.6/SB-31); valida el rol; normaliza el email a su forma
   * canónica y comprueba que no exista otro usuario con ese email o username
   * (incluye borrados lógicos, `paranoid: false`). Si se pasa `actorId`, registra
   * un evento `CREATE` en auditoría.
   *
   * @param data - Datos del usuario: `username`, `email`, `password`, `firstName`, `lastName`, `role` (por defecto `'GUARDIA'`).
   * @param actorId - Identificador opcional del usuario que ejecuta la acción; si se indica se audita el alta.
   * @returns Promesa que resuelve al usuario creado ya saneado (sin el campo `password`).
   * @throws {Error} `'Usuario, correo y contraseña son obligatorios.'` si falta alguno de esos campos.
   * @throws {Error} Con el mensaje devuelto por `passwordError(password)` si la contraseña no cumple la política.
   * @throws {Error} `'Rol inválido.'` si `role` no está en `VALID_ROLES`.
   * @throws {Error} `'Ya existe un usuario con ese correo o nombre de usuario.'` si el email canónico o el username ya están en uso.
   */
  async create(data: any, actorId?: string) {
    const { username, email, password, firstName, lastName, role } = data;
    if (!username?.trim() || !email?.trim() || !password) {
      throw new Error('Usuario, correo y contraseña son obligatorios.');
    }
    // Política de contraseñas ÚNICA (D2.6/SB-31): antes aquí bastaban 6 caracteres,
    // debilitando el camino de alta frente al de /api/auth/register.
    const createPwErr = passwordError(password);
    if (createPwErr) throw new Error(createPwErr);
    if (role && !VALID_ROLES.includes(role)) throw new Error('Rol inválido.');

    // El modelo guarda la forma canónica (hook, R2-03c): el control de
    // duplicado tiene que comparar contra esa misma forma o deja pasar
    // variantes de mayúsculas que luego chocan con la unicidad.
    const canonicalEmail = normalizeEmail(String(email));
    const exists = await User.findOne({ where: { [Op.or]: [{ email: canonicalEmail }, { username }] }, paranoid: false });
    if (exists) throw new Error('Ya existe un usuario con ese correo o nombre de usuario.');

    const user = await User.create({
      username: username.trim(),
      email: canonicalEmail,
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

  /**
   * Actualiza un usuario existente de forma parcial (solo los campos presentes en `data`).
   *
   * Impide que un actor se desactive a sí mismo; valida el rol y, si viene una
   * nueva contraseña, la valida con `passwordError` (política única D2.6/SB-31,
   * el hook del modelo la hashea). Si cambia el email, lo normaliza y verifica
   * que no colisione con otro usuario. Si se pasa `actorId` y hubo cambios,
   * registra un evento `UPDATE` en auditoría con el diff `{ from, to }` (la
   * contraseña se enmascara como `'••••' → '(restablecida)'`).
   *
   * @param id - Identificador (PK) del usuario a actualizar.
   * @param data - Campos a modificar: `email`, `firstName`, `lastName`, `role`, `isActive`, `password` (todos opcionales).
   * @param actorId - Identificador opcional del usuario que ejecuta la acción; si se indica se audita el cambio.
   * @returns Promesa que resuelve al usuario actualizado ya saneado (sin el campo `password`).
   * @throws {Error} `'Usuario no encontrado.'` si no existe un usuario con ese `id`.
   * @throws {Error} `'No puedes desactivar tu propia cuenta.'` si el actor intenta poner `isActive: false` sobre sí mismo.
   * @throws {Error} `'Rol inválido.'` si `data.role` no está en `VALID_ROLES`.
   * @throws {Error} Con el mensaje devuelto por `passwordError(data.password)` si la nueva contraseña no cumple la política.
   * @throws {Error} `'Ya existe un usuario con ese correo.'` si el nuevo email canónico pertenece a otro usuario.
   */
  async update(id: string, data: any, actorId?: string) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado.');

    if (actorId && actorId === id && data.isActive === false) {
      throw new Error('No puedes desactivar tu propia cuenta.');
    }
    if (data.role && !VALID_ROLES.includes(data.role)) throw new Error('Rol inválido.');
    // Misma política única al restablecer contraseña (D2.6/SB-31).
    if (data.password) {
      const updatePwErr = passwordError(data.password);
      if (updatePwErr) throw new Error(updatePwErr);
    }

    // No dejar el sistema sin NINGÚN administrador activo: si este usuario es el último
    // ADMIN activo, no se puede degradar su rol ni desactivarlo (lo haga él u otro admin).
    const losesAdmin = (data.role !== undefined && data.role !== 'ADMIN') || data.isActive === false;
    if (losesAdmin && (user as any).role === 'ADMIN' && (user as any).isActive) {
      const otherActiveAdmins = await User.count({ where: { role: 'ADMIN', isActive: true, id: { [Op.ne]: id } } });
      if (otherActiveAdmins === 0) throw new Error('No puedes dejar el sistema sin ningún administrador activo.');
    }

    const before: any = { email: (user as any).email, firstName: (user as any).firstName, lastName: (user as any).lastName, role: (user as any).role, isActive: (user as any).isActive };
    const patch: any = {};
    // Comparación y guardado sobre la forma canónica (hook del modelo, R2-03c).
    if (data.email && data.email.trim() && normalizeEmail(String(data.email)) !== (user as any).email) {
      const canonicalEmail = normalizeEmail(String(data.email));
      const dup = await User.findOne({ where: { email: canonicalEmail }, paranoid: false });
      if (dup && (dup as any).id !== id) throw new Error('Ya existe un usuario con ese correo.');
      patch.email = canonicalEmail;
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

  /**
   * Elimina (borrado lógico) un usuario e impide que el actor se elimine a sí mismo.
   *
   * Usa `destroy()` con el modelo paranoid (soft delete). Si se pasa `actorId`,
   * registra un evento `DELETE` en auditoría con el nombre y el motivo.
   *
   * @param id - Identificador (PK) del usuario a eliminar.
   * @param actorId - Identificador opcional del usuario que ejecuta la acción; si se indica se audita la baja.
   * @param reason - Motivo opcional de la eliminación, que se guarda en los detalles de auditoría.
   * @returns Promesa que resuelve a `{ ok: true }` si la operación tuvo éxito.
   * @throws {Error} `'No puedes eliminar tu propia cuenta.'` si `actorId` coincide con `id`.
   * @throws {Error} `'Usuario no encontrado.'` si no existe un usuario con ese `id`.
   */
  async remove(id: string, actorId?: string, reason?: string) {
    if (actorId && actorId === id) throw new Error('No puedes eliminar tu propia cuenta.');
    const user = await User.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado.');
    // No eliminar al ÚLTIMO administrador activo (evita quedarse sin gestión de usuarios).
    if ((user as any).role === 'ADMIN' && (user as any).isActive) {
      const otherActiveAdmins = await User.count({ where: { role: 'ADMIN', isActive: true, id: { [Op.ne]: id } } });
      if (otherActiveAdmins === 0) throw new Error('No puedes eliminar al último administrador activo.');
    }
    const name = (user as any).username;
    await user.destroy(); // soft delete (paranoid)
    if (actorId) {
      await auditLogService.log({ userId: actorId, action: 'DELETE', entity: 'User', entityId: id, details: { name, reason: reason || null } });
    }
    return { ok: true };
  }
}

export const userService = new UserService();
