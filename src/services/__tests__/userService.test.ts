import { Op } from 'sequelize';
import { UserService } from '../userService';
import { User, AuditLog } from '@/models/index';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const UserMock = User as jest.Mocked<typeof User>;
const AuditLogMock = AuditLog as jest.Mocked<typeof AuditLog>;

// contraseña que cumple la política única (8+, mayús, minús, número, especial)
const STRONG = 'Password123!';

// Instancia de usuario mockeada: props directas + get()/update()/destroy().
const makeUser = (init: any = {}) => {
  const data: any = {
    id: 'user-1',
    username: 'tester',
    email: 'old@x.com',
    firstName: 'Old',
    lastName: 'Name',
    role: 'GUARDIA',
    isActive: true,
    password: 'hashed',
    ...init,
  };
  const u: any = {
    ...data,
    get: jest.fn(() => ({ ...data })),
    update: jest.fn(async (patch: any) => {
      Object.assign(data, patch);
      Object.assign(u, patch);
      return u;
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  return u;
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('devuelve los usuarios con los atributos públicos', async () => {
      const rows = [{ id: 'u1' }, { id: 'u2' }];
      (UserMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.list();

      expect(UserMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ order: [['createdAt', 'ASC']] }),
      );
      expect(result).toBe(rows);
    });
  });

  describe('create', () => {
    it('crea un usuario, normaliza el correo y registra auditoría', async () => {
      (UserMock.findOne as jest.Mock).mockResolvedValue(null);
      (UserMock.create as jest.Mock).mockResolvedValue(
        makeUser({ id: 'nuevo', username: 'nuevo', email: 'juan@x.com', role: 'ADMIN' }),
      );

      const result = await service.create(
        { username: '  nuevo ', email: 'JUAN@X.com', password: STRONG, role: 'ADMIN' },
        'actor-1',
      );

      // Duplicado comprobado contra la forma canónica del correo.
      expect(UserMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { [Op.or]: [{ email: 'juan@x.com' }, { username: '  nuevo ' }] },
          paranoid: false,
        }),
      );
      // username recortado, email canónico.
      expect(UserMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'nuevo', email: 'juan@x.com', role: 'ADMIN', isActive: true }),
      );
      // sanitize elimina la contraseña.
      expect(result.password).toBeUndefined();
      expect(result.username).toBe('nuevo');
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
    });

    it('aplica el rol por defecto GUARDIA y no audita sin actor', async () => {
      (UserMock.findOne as jest.Mock).mockResolvedValue(null);
      // Objeto plano SIN get(): cubre la rama else de sanitize.
      (UserMock.create as jest.Mock).mockResolvedValue({
        id: 'x',
        username: 'plano',
        email: 'plano@x.com',
        role: 'GUARDIA',
        password: 'hashed',
      });

      const result = await service.create({ username: 'plano', email: 'Plano@X.com', password: STRONG });

      expect(UserMock.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'GUARDIA' }));
      expect(result.password).toBeUndefined();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });

    it('exige usuario, correo y contraseña', async () => {
      await expect(service.create({ email: 'a@x.com', password: STRONG })).rejects.toThrow(
        'Usuario, correo y contraseña son obligatorios.',
      );
      await expect(service.create({ username: 'u', password: STRONG })).rejects.toThrow(
        'Usuario, correo y contraseña son obligatorios.',
      );
      await expect(service.create({ username: 'u', email: 'a@x.com' })).rejects.toThrow(
        'Usuario, correo y contraseña son obligatorios.',
      );
      expect(UserMock.create).not.toHaveBeenCalled();
    });

    it('rechaza contraseñas que no cumplen la política', async () => {
      await expect(
        service.create({ username: 'u', email: 'a@x.com', password: 'weak' }),
      ).rejects.toThrow(/contraseña/i);
      expect(UserMock.create).not.toHaveBeenCalled();
    });

    it('rechaza un rol inválido', async () => {
      await expect(
        service.create({ username: 'u', email: 'a@x.com', password: STRONG, role: 'SUPERADMIN' }),
      ).rejects.toThrow('Rol inválido.');
    });

    it('rechaza si ya existe usuario con ese correo o nombre', async () => {
      (UserMock.findOne as jest.Mock).mockResolvedValue({ id: 'existente' });

      await expect(
        service.create({ username: 'u', email: 'a@x.com', password: STRONG }),
      ).rejects.toThrow('Ya existe un usuario con ese correo o nombre de usuario.');
      expect(UserMock.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('actualiza campos y registra los cambios en auditoría', async () => {
      const user = makeUser();
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      const result = await service.update('user-1', { firstName: 'Nuevo' }, 'actor-1');

      expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Nuevo' }));
      expect(result.password).toBeUndefined();
      expect(result.firstName).toBe('Nuevo');
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
    });

    it('lanza error si el usuario no existe', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nope', { firstName: 'X' })).rejects.toThrow('Usuario no encontrado.');
    });

    it('impide desactivar la propia cuenta', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue(makeUser({ id: 'me' }));

      await expect(service.update('me', { isActive: false }, 'me')).rejects.toThrow(
        'No puedes desactivar tu propia cuenta.',
      );
    });

    it('rechaza un rol inválido', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue(makeUser());

      await expect(service.update('user-1', { role: 'ROOT' })).rejects.toThrow('Rol inválido.');
    });

    it('rechaza una contraseña que no cumple la política', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue(makeUser());

      await expect(service.update('user-1', { password: 'weak' })).rejects.toThrow(/contraseña/i);
    });

    it('cambia el correo comprobando duplicados sobre la forma canónica', async () => {
      const user = makeUser({ email: 'old@x.com' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);
      (UserMock.findOne as jest.Mock).mockResolvedValue(null);

      await service.update('user-1', { email: 'NEW@X.com' }, 'actor-1');

      expect(UserMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'new@x.com' }, paranoid: false }),
      );
      expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@x.com' }));
    });

    it('lanza error si el nuevo correo pertenece a otro usuario', async () => {
      const user = makeUser({ id: 'user-1', email: 'old@x.com' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);
      (UserMock.findOne as jest.Mock).mockResolvedValue({ id: 'otro' });

      await expect(service.update('user-1', { email: 'taken@x.com' })).rejects.toThrow(
        'Ya existe un usuario con ese correo.',
      );
      expect(user.update).not.toHaveBeenCalled();
    });

    it('no consulta duplicados si el correo no cambia en su forma canónica', async () => {
      const user = makeUser({ email: 'old@x.com' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.update('user-1', { email: 'OLD@x.com', firstName: 'Z' }, 'actor-1');

      expect(UserMock.findOne).not.toHaveBeenCalled();
      const patch = (user.update as jest.Mock).mock.calls[0][0];
      expect(patch.email).toBeUndefined();
      expect(patch.firstName).toBe('Z');
    });

    it('restablece la contraseña y lo refleja en la auditoría', async () => {
      const user = makeUser();
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.update('user-1', { password: STRONG }, 'actor-1');

      expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ password: STRONG }));
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.password).toBeDefined();
    });

    it('no audita cuando no hay cambios reales', async () => {
      const user = makeUser();
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.update('user-1', {}, 'actor-1');

      expect(user.update).toHaveBeenCalledWith({});
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });

    it('actualiza apellido, rol e isActive a la vez', async () => {
      const user = makeUser();
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.update(
        'user-1',
        { lastName: 'Apellido', role: 'MANAGER', isActive: false },
        'actor-1',
      );

      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ lastName: 'Apellido', role: 'MANAGER', isActive: false }),
      );
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.role).toEqual({ from: 'GUARDIA', to: 'MANAGER' });
      expect(details.changes.isActive).toEqual({ from: true, to: false });
    });

    it('actualiza sin auditar cuando no hay actor', async () => {
      const user = makeUser();
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.update('user-1', { firstName: 'Solo' });

      expect(user.update).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina (soft delete) y registra auditoría', async () => {
      const user = makeUser({ id: 'target', username: 'target' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      const result = await service.remove('target', 'actor-1', 'motivo');

      expect(user.destroy).toHaveBeenCalled();
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true });
    });

    it('impide eliminar la propia cuenta', async () => {
      await expect(service.remove('me', 'me')).rejects.toThrow('No puedes eliminar tu propia cuenta.');
      expect(UserMock.findByPk).not.toHaveBeenCalled();
    });

    it('lanza error si el usuario no existe', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nope', 'actor-1')).rejects.toThrow('Usuario no encontrado.');
    });

    it('audita sin motivo cuando no se indica razón', async () => {
      const user = makeUser({ id: 'target', username: 'target' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      await service.remove('target', 'actor-1');

      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.reason).toBeNull();
    });

    it('elimina sin auditar cuando no hay actor', async () => {
      const user = makeUser({ id: 'target' });
      (UserMock.findByPk as jest.Mock).mockResolvedValue(user);

      const result = await service.remove('target');

      expect(user.destroy).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });
});
