import { Op, Sequelize } from 'sequelize';
import { ParticipantService } from '../participantService';
import Participant from '@/models/Participant';
import { sequelize } from '@/lib/sequelize';

describe('Listado: búsqueda por nombre completo', () => {
  const generator = new Sequelize('postgres://test:test@localhost/test', { logging: false }).getQueryInterface().queryGenerator as { getWhereConditions(where: any): string };
  const service = new ParticipantService();
  beforeEach(() => {
    jest.clearAllMocks();
    (sequelize.literal as jest.Mock).mockImplementation((value: string) => Sequelize.literal(value));
    (Participant.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });
  });
  test.each([
    ['ricardo v', '%ricardo v%'],
    ['RICARDO VERGARA', '%ricardo vergara%'],
    ['  Ricardo   Vergara  ', '%ricardo vergara%'],
    ['José Pérez', '%jose perez%'],
    ["O'Connor", "%o'connor%"],
  ])('admite %s en el nombre completo y mantiene evento/paginación', async (query, expected) => {
    await service.listParticipants('evento-uno', { name: query, registered: true }, { page: 2, limit: 10 });
    const options = (Participant.findAndCountAll as jest.Mock).mock.calls[0][0];
    const sql = generator.getWhereConditions(options.where);
    expect(options.where.eventId).toBe('evento-uno');
    expect(options.limit).toBe(10);
    expect(options.offset).toBe(10);
    expect(sql).toContain('CONCAT_WS');
    expect(sql).toContain('REGEXP_REPLACE');
    expect(sql).toContain(expected.replace(/'/g, "''"));
  });
  test('mantiene la búsqueda por RUT normalizado', async () => {
    await service.listParticipants('evento-uno', { name: '11.111.111-1' }, { page: 1, limit: 10 });
    const options = (Participant.findAndCountAll as jest.Mock).mock.calls[0][0];
    const sql = generator.getWhereConditions(options.where);
    expect(sql).toContain('%111111111%');
  });
  test('una búsqueda vacía no agrega restricciones de nombre', async () => {
    await service.listParticipants('evento-uno', { name: '   ' }, { page: 1, limit: 10 });
    const options = (Participant.findAndCountAll as jest.Mock).mock.calls[0][0];
    expect(options.where[Op.or]).toBeUndefined();
  });
});
