import { GiftService } from '../giftService';
import { sequelize } from '@/lib/sequelize';
import GiftCampaign from '@/models/GiftCampaign';
import GiftType from '@/models/GiftType';
import GiftEmployee from '@/models/GiftEmployee';
import GiftDelivery from '@/models/GiftDelivery';
import { Op } from 'sequelize';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const CampaignMock = GiftCampaign as jest.Mocked<typeof GiftCampaign>;
const TypeMock = GiftType as jest.Mocked<typeof GiftType>;
const EmployeeMock = GiftEmployee as jest.Mocked<typeof GiftEmployee>;
const DeliveryMock = GiftDelivery as jest.Mocked<typeof GiftDelivery>;

describe('GiftService', () => {
  let service: GiftService;
  let currentTx: any;

  beforeEach(() => {
    service = new GiftService();
    jest.clearAllMocks();

    // Transacción manual: `const tx = await sequelize.transaction()`.
    (sequelize.transaction as jest.Mock).mockImplementation(async (a?: any, b?: any) => {
      const t = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        LOCK: { UPDATE: 'UPDATE' },
      };
      currentTx = t;
      const cb = typeof a === 'function' ? a : typeof b === 'function' ? b : undefined;
      if (cb) {
        const parent = a && typeof a === 'object' && a.transaction ? a.transaction : t;
        return cb(parent);
      }
      return t;
    });

    // findOrCreate no lo provee la fábrica de jest.setup.js: se añade aquí.
    (DeliveryMock as any).findOrCreate = jest.fn();
  });

  // ------------------------------------------------------------------ Campañas
  describe('listCampaigns', () => {
    it('devuelve las campañas ordenadas por createdAt DESC', async () => {
      const rows = [{ id: 'c1' }, { id: 'c2' }];
      (CampaignMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.listCampaigns();

      expect(CampaignMock.findAll).toHaveBeenCalledWith({ order: [['createdAt', 'DESC']] });
      expect(result).toBe(rows);
    });
  });

  describe('createCampaign', () => {
    it('crea la campaña y sus dos tipos por defecto (FAMILY, CHILD)', async () => {
      const created = { id: 'camp-1', name: 'Navidad' };
      (CampaignMock.create as jest.Mock).mockResolvedValue(created);
      (TypeMock.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await service.createCampaign('Navidad');

      expect(CampaignMock.create).toHaveBeenCalledWith({ name: 'Navidad' });
      expect(TypeMock.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({ campaignId: 'camp-1', basis: 'FAMILY', order: 0 }),
        expect.objectContaining({ campaignId: 'camp-1', basis: 'CHILD', order: 1 }),
      ]);
      expect(result).toBe(created);
    });
  });

  describe('getCampaign', () => {
    it('busca la campaña por PK', async () => {
      const camp = { id: 'c1' };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);

      const result = await service.getCampaign('c1');

      expect(CampaignMock.findByPk).toHaveBeenCalledWith('c1');
      expect(result).toBe(camp);
    });
  });

  describe('updateCampaign', () => {
    it('lanza error si la campaña no existe', async () => {
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.updateCampaign('x', {})).rejects.toThrow('Campaña no encontrada');
    });

    it('actualiza los campos dados', async () => {
      const camp: any = { id: 'c1', name: 'Old', isActive: true, update: jest.fn().mockResolvedValue(undefined) };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);

      const result = await service.updateCampaign('c1', { name: 'New', isActive: false });

      expect(camp.update).toHaveBeenCalledWith({ name: 'New', isActive: false });
      expect(result).toBe(camp);
    });

    it('conserva los valores previos cuando no vienen en data (??)', async () => {
      const camp: any = { id: 'c1', name: 'Old', isActive: true, update: jest.fn().mockResolvedValue(undefined) };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);

      await service.updateCampaign('c1', {});

      expect(camp.update).toHaveBeenCalledWith({ name: 'Old', isActive: true });
    });
  });

  describe('deleteCampaign', () => {
    it('lanza error si la campaña no existe', async () => {
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteCampaign('x')).rejects.toThrow('Campaña no encontrada');
    });

    it('borra en cascada (entregas, tipos, empleados y campaña) y hace commit', async () => {
      const camp: any = { id: 'c1', destroy: jest.fn().mockResolvedValue(undefined) };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([{ id: 't1' }]);
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([{ id: 'e1' }]);
      (DeliveryMock.destroy as jest.Mock).mockResolvedValue(1);
      (TypeMock.destroy as jest.Mock).mockResolvedValue(1);
      (EmployeeMock.destroy as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteCampaign('c1');

      expect(DeliveryMock.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { [Op.or]: [{ giftTypeId: { [Op.in]: ['t1'] } }, { employeeId: { [Op.in]: ['e1'] } }] },
          force: true,
        }),
      );
      expect(TypeMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'c1' }, force: true }));
      expect(EmployeeMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'c1' }, force: true }));
      expect(camp.destroy).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
      expect(currentTx.commit).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('no intenta borrar entregas si no hay tipos ni empleados', async () => {
      const camp: any = { id: 'c1', destroy: jest.fn().mockResolvedValue(undefined) };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([]);
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([]);
      (TypeMock.destroy as jest.Mock).mockResolvedValue(0);
      (EmployeeMock.destroy as jest.Mock).mockResolvedValue(0);

      const result = await service.deleteCampaign('c1');

      expect(DeliveryMock.destroy).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('hace rollback y relanza si algo falla en la transacción', async () => {
      const camp: any = { id: 'c1', destroy: jest.fn().mockRejectedValue(new Error('boom')) };
      (CampaignMock.findByPk as jest.Mock).mockResolvedValue(camp);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([]);
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([]);
      (TypeMock.destroy as jest.Mock).mockResolvedValue(0);
      (EmployeeMock.destroy as jest.Mock).mockResolvedValue(0);

      await expect(service.deleteCampaign('c1')).rejects.toThrow('boom');
      expect(currentTx.rollback).toHaveBeenCalled();
      expect(currentTx.commit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------- Tipos regalo
  describe('listTypes', () => {
    it('lista los tipos de una campaña ordenados', async () => {
      const rows = [{ id: 't1' }];
      (TypeMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.listTypes('c1');

      expect(TypeMock.findAll).toHaveBeenCalledWith({
        where: { campaignId: 'c1' },
        order: [['order', 'ASC'], ['createdAt', 'ASC']],
      });
      expect(result).toBe(rows);
    });
  });

  describe('createType', () => {
    it('lanza error si falta el nombre', async () => {
      await expect(service.createType('c1', {})).rejects.toThrow('El nombre del tipo es obligatorio');
    });

    it('crea el tipo con un basis válido y order numérico', async () => {
      const created = { id: 't1' };
      (TypeMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createType('c1', { name: 'Cargas', basis: 'CARGA', order: '3' });

      expect(TypeMock.create).toHaveBeenCalledWith({ campaignId: 'c1', name: 'Cargas', basis: 'CARGA', order: 3 });
      expect(result).toBe(created);
    });

    it('cae a FAMILY con basis inválido y order 0 por defecto', async () => {
      (TypeMock.create as jest.Mock).mockResolvedValue({ id: 't1' });

      await service.createType('c1', { name: 'Otro', basis: 'WEIRD' });

      expect(TypeMock.create).toHaveBeenCalledWith({ campaignId: 'c1', name: 'Otro', basis: 'FAMILY', order: 0 });
    });
  });

  describe('updateType', () => {
    it('lanza error si el tipo no existe', async () => {
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.updateType('x', {})).rejects.toThrow('Tipo de regalo no encontrado');
    });

    it('actualiza con fallback a los valores previos', async () => {
      const t: any = { id: 't1', name: 'N', basis: 'FAMILY', order: 2, update: jest.fn().mockResolvedValue(undefined) };
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(t);

      const result = await service.updateType('t1', { name: 'Nuevo' });

      expect(t.update).toHaveBeenCalledWith({ name: 'Nuevo', basis: 'FAMILY', order: 2 });
      expect(result).toBe(t);
    });
  });

  describe('deleteType', () => {
    it('lanza error si el tipo no existe', async () => {
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteType('x')).rejects.toThrow('Tipo de regalo no encontrado');
    });

    it('borra las entregas del tipo y luego el tipo, con commit', async () => {
      const t: any = { id: 't1', destroy: jest.fn().mockResolvedValue(undefined) };
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(t);
      (DeliveryMock.destroy as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteType('t1');

      expect(DeliveryMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { giftTypeId: 't1' }, force: true }));
      expect(t.destroy).toHaveBeenCalled();
      expect(currentTx.commit).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('hace rollback si falla el borrado', async () => {
      const t: any = { id: 't1', destroy: jest.fn().mockRejectedValue(new Error('fail')) };
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(t);
      (DeliveryMock.destroy as jest.Mock).mockResolvedValue(1);

      await expect(service.deleteType('t1')).rejects.toThrow('fail');
      expect(currentTx.rollback).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------- Empleados
  describe('listEmployees', () => {
    it('mapea a cada empleado con el estado de sus regalos (todos los estados)', async () => {
      const emp1: any = {
        get: jest.fn(() => ({
          id: 'e1', fullName: 'Ana', empresa: 'ACME', cargas: 2, cargasHijos: 1,
          deliveries: [{ giftTypeId: 't-fam', deliveredQty: 1 }, { giftTypeId: 't-carga', deliveredQty: 1 }],
        })),
      };
      const emp2: any = {
        get: jest.fn(() => ({ id: 'e2', fullName: 'Ben', empresa: null, cargas: 0, cargasHijos: 0, deliveries: [] })),
      };
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([emp1, emp2]);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([
        { id: 't-fam', name: 'Caja', basis: 'FAMILY' },
        { id: 't-child', name: 'Hijo', basis: 'CHILD' },
        { id: 't-carga', name: 'Carga', basis: 'CARGA' },
      ]);

      const result = await service.listEmployees('c1');

      expect(EmployeeMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { campaignId: 'c1' }, order: [['fullName', 'ASC']] }),
      );
      // emp1: FAMILY entregado (1/1) DELIVERED, CHILD 0/1 PENDING, CARGA 1/2 PARTIAL
      expect(result[0].gifts).toEqual([
        { typeId: 't-fam', name: 'Caja', basis: 'FAMILY', total: 1, delivered: 1, status: 'DELIVERED' },
        { typeId: 't-child', name: 'Hijo', basis: 'CHILD', total: 1, delivered: 0, status: 'PENDING' },
        { typeId: 't-carga', name: 'Carga', basis: 'CARGA', total: 2, delivered: 1, status: 'PARTIAL' },
      ]);
      // emp2: FAMILY 0/1 PENDING, CHILD total 0 NA, CARGA total 0 NA
      expect(result[1].gifts.map((g: any) => g.status)).toEqual(['PENDING', 'NA', 'NA']);
      // La propiedad cruda `deliveries` se elimina del resultado.
      expect(result[0]).not.toHaveProperty('deliveries');
      expect(result[0]).toMatchObject({ id: 'e1', fullName: 'Ana' });
    });
  });

  describe('createEmployee', () => {
    it('lanza error si falta el nombre', async () => {
      await expect(service.createEmployee('c1', {})).rejects.toThrow('El nombre del empleado es obligatorio');
    });

    it('crea con defaults y source MANUAL', async () => {
      const created = { id: 'e1' };
      (EmployeeMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createEmployee('c1', { fullName: 'Ana' });

      expect(EmployeeMock.create).toHaveBeenCalledWith({
        campaignId: 'c1', fullName: 'Ana', rut: null, empresa: null, cargas: 0, cargasHijos: 0, source: 'MANUAL',
      });
      expect(result).toBe(created);
    });

    it('respeta el source IMPORT y convierte números', async () => {
      (EmployeeMock.create as jest.Mock).mockResolvedValue({ id: 'e1' });

      await service.createEmployee('c1', { fullName: 'Ana', rut: '1-9', empresa: 'ACME', cargas: '3', cargasHijos: '2' }, 'IMPORT');

      expect(EmployeeMock.create).toHaveBeenCalledWith({
        campaignId: 'c1', fullName: 'Ana', rut: '1-9', empresa: 'ACME', cargas: 3, cargasHijos: 2, source: 'IMPORT',
      });
    });
  });

  describe('updateEmployee', () => {
    it('lanza error si el empleado no existe', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.updateEmployee('x', {})).rejects.toThrow('Empleado no encontrado');
    });

    it('actualiza convirtiendo cargas y conservando lo no enviado', async () => {
      const e: any = { id: 'e1', fullName: 'Ana', rut: '1', empresa: 'ACME', cargas: 2, cargasHijos: 1, update: jest.fn().mockResolvedValue(undefined) };
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(e);

      const result = await service.updateEmployee('e1', { fullName: 'Ana M.', cargas: '5' });

      expect(e.update).toHaveBeenCalledWith({
        fullName: 'Ana M.', rut: '1', empresa: 'ACME', cargas: 5, cargasHijos: 1,
      });
      expect(result).toBe(e);
    });
  });

  describe('deleteEmployee', () => {
    it('lanza error si el empleado no existe', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteEmployee('x')).rejects.toThrow('Empleado no encontrado');
    });

    it('borra sus entregas y luego el empleado, con commit', async () => {
      const e: any = { id: 'e1', destroy: jest.fn().mockResolvedValue(undefined) };
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(e);
      (DeliveryMock.destroy as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteEmployee('e1');

      expect(DeliveryMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { employeeId: 'e1' }, force: true }));
      expect(e.destroy).toHaveBeenCalled();
      expect(currentTx.commit).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('hace rollback si falla el borrado', async () => {
      const e: any = { id: 'e1', destroy: jest.fn().mockRejectedValue(new Error('nope')) };
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(e);
      (DeliveryMock.destroy as jest.Mock).mockResolvedValue(1);

      await expect(service.deleteEmployee('e1')).rejects.toThrow('nope');
      expect(currentTx.rollback).toHaveBeenCalled();
    });
  });

  describe('importEmployees', () => {
    it('crea, actualiza y registra errores por fila', async () => {
      const existing: any = { id: 'e1', update: jest.fn().mockResolvedValue(undefined) };
      (EmployeeMock.findOne as jest.Mock)
        .mockResolvedValueOnce(existing) // rut '1' -> existe
        .mockResolvedValueOnce(null);    // rut '2' -> no existe
      (EmployeeMock.create as jest.Mock).mockResolvedValue({ id: 'new' });

      const rows = [
        { fullName: 'A', rut: '1', cargas: '2' }, // update
        { fullName: 'B', rut: '2' },              // create (rut nuevo)
        { fullName: 'C' },                        // create (sin rut, no consulta findOne)
        { rut: '4' },                             // error: sin nombre
      ];

      const result = await service.importEmployees('c1', rows);

      expect(EmployeeMock.findOne).toHaveBeenCalledTimes(2);
      expect(existing.update).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'A', empresa: null, cargas: 2, cargasHijos: 0 }),
      );
      expect(EmployeeMock.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        created: 2,
        updated: 1,
        errors: [{ row: 4, error: 'Falta el nombre del empleado' }],
      });
    });

    it('tolera filas nulas registrándolas como error', async () => {
      const result = await service.importEmployees('c1', [null]);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual([{ row: 1, error: 'Falta el nombre del empleado' }]);
    });
  });

  // ------------------------------------------------------------------- Entrega
  describe('setDelivery', () => {
    it('lanza error si el empleado no existe', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(null);
      (TypeMock.findByPk as jest.Mock).mockResolvedValue({ id: 't1' });
      await expect(service.setDelivery('e1', 't1', 1)).rejects.toThrow('Empleado no encontrado');
    });

    it('lanza error si el tipo no existe', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue({ id: 'e1' });
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.setDelivery('e1', 't1', 1)).rejects.toThrow('Tipo de regalo no encontrado');
    });

    it('lanza error si empleado y tipo son de campañas distintas', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue({ id: 'e1', campaignId: 'c1' });
      (TypeMock.findByPk as jest.Mock).mockResolvedValue({ id: 't1', campaignId: 'c2', basis: 'FAMILY' });
      await expect(service.setDelivery('e1', 't1', 1)).rejects.toThrow('no pertenecen a la misma campaña');
    });

    it('topa la cantidad al entitlement y marca fecha/usuario', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue({ id: 'e1', campaignId: 'c1', cargas: 3, cargasHijos: 2 });
      (TypeMock.findByPk as jest.Mock).mockResolvedValue({ id: 't1', campaignId: 'c1', basis: 'CARGA' });
      const d: any = { id: 'd1', update: jest.fn().mockResolvedValue(undefined) };
      (DeliveryMock as any).findOrCreate.mockResolvedValue([d, true]);

      const result = await service.setDelivery('e1', 't1', 5, 'user-x'); // 5 > total(3) -> 3

      expect((DeliveryMock as any).findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId: 'e1', giftTypeId: 't1' } }),
      );
      const arg = d.update.mock.calls[0][0];
      expect(arg.deliveredQty).toBe(3);
      expect(arg.deliveredAt).toBeInstanceOf(Date);
      expect(arg.deliveredBy).toBe('user-x');
      expect(result).toBe(d);
    });

    it('con cantidad 0 limpia fecha y usuario', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue({ id: 'e1', campaignId: 'c1', cargas: 3, cargasHijos: 2 });
      (TypeMock.findByPk as jest.Mock).mockResolvedValue({ id: 't1', campaignId: 'c1', basis: 'FAMILY' });
      const d: any = { id: 'd1', update: jest.fn().mockResolvedValue(undefined) };
      (DeliveryMock as any).findOrCreate.mockResolvedValue([d, false]);

      await service.setDelivery('e1', 't1', -5, 'user-x'); // negativo -> 0

      expect(d.update).toHaveBeenCalledWith({ deliveredQty: 0, deliveredAt: null, deliveredBy: null });
    });
  });

  // ------------------------------------------------------------------- Totales
  describe('summary', () => {
    it('agrega por tipo y por empresa (con "Sin empresa") y ordena', async () => {
      const emp1: any = {
        get: jest.fn(() => ({
          id: 'e1', empresa: 'ACME', cargas: 2, cargasHijos: 1,
          deliveries: [{ giftTypeId: 't-fam', deliveredQty: 1 }, { giftTypeId: 't-carga', deliveredQty: 1 }],
        })),
      };
      const emp2: any = {
        get: jest.fn(() => ({ id: 'e2', empresa: null, cargas: 0, cargasHijos: 0, deliveries: [] })),
      };
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([emp1, emp2]);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([
        { id: 't-fam', name: 'Caja', basis: 'FAMILY' },
        { id: 't-child', name: 'Hijo', basis: 'CHILD' },
        { id: 't-carga', name: 'Carga', basis: 'CARGA' },
      ]);

      const result = await service.summary('c1');

      expect(result.totalEmpleados).toBe(2);
      expect(result.byType).toEqual([
        { typeId: 't-fam', name: 'Caja', basis: 'FAMILY', total: 2, delivered: 1 },
        { typeId: 't-child', name: 'Hijo', basis: 'CHILD', total: 1, delivered: 0 },
        { typeId: 't-carga', name: 'Carga', basis: 'CARGA', total: 2, delivered: 1 },
      ]);
      expect(result.byEmpresa.map((r: any) => r.empresa)).toEqual(['ACME', 'Sin empresa']);
      const acme = result.byEmpresa.find((r: any) => r.empresa === 'ACME');
      expect(acme).toMatchObject({ empleados: 1, cargas: 2, cargasHijos: 1, total: 4, delivered: 2 });
    });
  });

  // -------------------------------------------------- Cobertura adicional ramas
  describe('cobertura adicional de ramas', () => {
    it('updateType conserva todos los valores previos con data vacía', async () => {
      const t: any = { id: 't1', name: 'N', basis: 'CHILD', order: 5, update: jest.fn().mockResolvedValue(undefined) };
      (TypeMock.findByPk as jest.Mock).mockResolvedValue(t);

      await service.updateType('t1', {});

      expect(t.update).toHaveBeenCalledWith({ name: 'N', basis: 'CHILD', order: 5 });
    });

    it('updateEmployee conserva todo con data vacía (cargas no enviadas)', async () => {
      const e: any = { id: 'e1', fullName: 'Ana', rut: '1', empresa: 'ACME', cargas: 2, cargasHijos: 1, update: jest.fn().mockResolvedValue(undefined) };
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue(e);

      await service.updateEmployee('e1', {});

      expect(e.update).toHaveBeenCalledWith({ fullName: 'Ana', rut: '1', empresa: 'ACME', cargas: 2, cargasHijos: 1 });
    });

    it('setDelivery deja deliveredBy null cuando no se pasa, aun con qty > 0', async () => {
      (EmployeeMock.findByPk as jest.Mock).mockResolvedValue({ id: 'e1', campaignId: 'c1', cargas: 3, cargasHijos: 2 });
      (TypeMock.findByPk as jest.Mock).mockResolvedValue({ id: 't1', campaignId: 'c1', basis: 'FAMILY' });
      const d: any = { id: 'd1', update: jest.fn().mockResolvedValue(undefined) };
      (DeliveryMock as any).findOrCreate.mockResolvedValue([d, false]);

      await service.setDelivery('e1', 't1', 1); // FAMILY total 1 -> qty 1, sin deliveredBy

      const arg = d.update.mock.calls[0][0];
      expect(arg.deliveredQty).toBe(1);
      expect(arg.deliveredAt).toBeInstanceOf(Date);
      expect(arg.deliveredBy).toBeNull();
    });

    it('listEmployees soporta empleados sin la propiedad deliveries (|| [])', async () => {
      const emp: any = { get: jest.fn(() => ({ id: 'e1', fullName: 'Ana', empresa: 'ACME', cargas: 1, cargasHijos: 0 })) };
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([emp]);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([{ id: 't-fam', name: 'Caja', basis: 'FAMILY' }]);

      const res = await service.listEmployees('c1');

      expect(res[0].gifts[0]).toMatchObject({ delivered: 0, status: 'PENDING' });
    });

    it('summary agrupa dos empleados de la misma empresa y soporta sin deliveries', async () => {
      const emp1: any = { get: jest.fn(() => ({ empresa: 'ACME', cargas: 1, cargasHijos: 0, deliveries: [{ giftTypeId: 't-fam', deliveredQty: 1 }] })) };
      const emp2: any = { get: jest.fn(() => ({ empresa: 'ACME', cargas: 1, cargasHijos: 0 })) }; // sin deliveries
      (EmployeeMock.findAll as jest.Mock).mockResolvedValue([emp1, emp2]);
      (TypeMock.findAll as jest.Mock).mockResolvedValue([{ id: 't-fam', name: 'Caja', basis: 'FAMILY' }]);

      const res = await service.summary('c1');

      expect(res.byEmpresa).toHaveLength(1);
      expect(res.byEmpresa[0]).toMatchObject({ empresa: 'ACME', empleados: 2, total: 2, delivered: 1 });
    });
  });
});
