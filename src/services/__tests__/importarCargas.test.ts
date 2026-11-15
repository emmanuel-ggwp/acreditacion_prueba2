import { mapParticipantImportRow, numericGuestImport } from '@/utils/participantImport';
import { ParticipantService } from '../participantService';
import { sequelize } from '@/lib/sequelize';
import Participant from '@/models/Participant';
import Event from '@/models/Event';
import Guest from '@/models/Guest';

describe('Mapeo y validación de cargas del Excel', () => {
  const headers = ['Nombre', 'Cargas', 'Acompañante', 'Invitados', 'Nombre invitado'];
  const mapping = { Nombre: 'firstName', Cargas: 'guestLoads', Acompañante: 'guestCompanion', Invitados: 'guestCount', 'Nombre invitado': 'guest1.firstName' };
  test('conserva los tres campos numéricos como datos del titular', () => {
    expect(mapParticipantImportRow({ Nombre: 'RICARDO', Cargas: 4, Acompañante: 'No', Invitados: 0, 'Nombre invitado': 'Ana' }, headers, mapping))
      .toEqual({ firstName: 'RICARDO', guestLoads: '4', guestCompanion: 'No', guestCount: '0', guests: [{ firstName: 'Ana' }] });
  });
  test('el vacío se omite y el cero explícito se conserva', () => {
    expect(mapParticipantImportRow({ Cargas: '', Acompañante: ' ', Invitados: 0 }, headers, mapping)).toEqual({ guestCount: '0', guests: [] });
  });
  test.each(['Sí', 'si', true, 'x', 1])('acepta acompañante %s', companion => {
    expect(numericGuestImport({ guestCompanion: companion, guestLoads: '3' })).toEqual({ guestCompanion: true, guestLoads: 3, guestCount: 4 });
  });
  test.each(['No', false, 0])('acepta sin acompañante %s', companion => {
    expect(numericGuestImport({ guestCompanion: companion, guestLoads: '3' }).guestCount).toBe(3);
  });
  test.each([-1, '1.5', 'abc', 'Infinity'])('rechaza cantidad inválida %s', value => {
    expect(() => numericGuestImport({ guestLoads: value })).toThrow('entero');
  });
  test('rechaza números de cargas en la columna acompañante con explicación', () => {
    expect(() => numericGuestImport({ guestCompanion: '4', guestLoads: 4 })).toThrow('Sí o No');
  });
  test('preserva campos ausentes y permite cero y No explícitos', () => {
    const current = { guestLoads: 4, guestCompanion: true };
    expect(numericGuestImport({ guestLoads: '' }, current)).toEqual({});
    expect(numericGuestImport({ guestLoads: 0 }, current)).toEqual({ guestLoads: 0, guestCount: 1 });
    expect(numericGuestImport({ guestCompanion: 'No' }, current)).toEqual({ guestCompanion: false, guestCount: 4 });
  });
  test('conserva modo solo cantidad y rechaza modos mezclados', () => {
    expect(numericGuestImport({ guestCount: '3' })).toEqual({ guestCount: 3, guestCompanion: false, guestLoads: 0 });
    expect(() => numericGuestImport({ guestCount: 3, guestLoads: 2 })).toThrow('ambos modos');
  });
});

describe('Importación completa del servicio', () => {
  const service = new ParticipantService();
  let transaction: any;
  let existing: any;
  beforeEach(() => {
    jest.clearAllMocks();
    transaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
    (sequelize.transaction as jest.Mock).mockResolvedValue(transaction);
    (Event.findByPk as jest.Mock).mockResolvedValue({ id: 'event' });
    (Guest.count as jest.Mock).mockResolvedValue(0);
    existing = { id: 'person', documentNumber: '11111111-1', guestLoads: 4, guestCompanion: true, update: jest.fn() };
    (Participant.findOne as jest.Mock).mockResolvedValue(existing);
    (Participant.create as jest.Mock).mockResolvedValue({ id: 'new' });
  });
  test('crea titular con cuatro cargas desde la fila mapeada', async () => {
    (Participant.findOne as jest.Mock).mockResolvedValue(null);
    const row = mapParticipantImportRow({ Nombre: 'Ricardo', RUT: '11111111-1', Cargas: 4, Acompañante: 'No' }, ['Nombre', 'RUT', 'Cargas', 'Acompañante'], { Nombre: 'firstName', RUT: 'documentNumber', Cargas: 'guestLoads', Acompañante: 'guestCompanion' });
    const result = await service.importParticipants('event', null, [row], 'user');
    expect(result.errors).toEqual([]);
    expect(Participant.create).toHaveBeenCalledWith(expect.objectContaining({ guestLoads: 4, guestCount: 4, guestCompanion: false }), expect.anything());
  });
  test('reimporta las cargas y conserva el acompañante y la identidad', async () => {
    const result = await service.importParticipants('event', null, [{ documentNumber: '11111111-1', guestLoads: '3' }], 'user');
    expect(result.errors).toEqual([]);
    expect(existing.update).toHaveBeenCalledWith({ guestLoads: 3, guestCount: 4 }, { transaction });
    expect(Participant.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: 'UPDATE' }));
  });
  test('sin cargas en la fila no actualiza datos existentes', async () => {
    await service.importParticipants('event', null, [{ documentNumber: '11111111-1', guestLoads: '' }], 'user');
    expect(existing.update).not.toHaveBeenCalled();
  });
  test('cero y No explícitos quitan cargas y acompañante', async () => {
    await service.importParticipants('event', null, [{ documentNumber: '11111111-1', guestLoads: 0, guestCompanion: 'No' }], 'user');
    expect(existing.update).toHaveBeenCalledWith({ guestLoads: 0, guestCount: 0, guestCompanion: false }, { transaction });
  });
  test('no modifica al titular que solo coincide por correo con otro RUT', async () => {
    existing.documentNumber = '13417351-3';
    const result = await service.importParticipants('event', null, [{ documentNumber: '11111111-1', email: 'compartido@test.cl', guestLoads: 3 }], 'user');
    expect(result.errors[0].error).toContain('otro RUT');
    expect(existing.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });
  test('no mezcla cargas numéricas con invitados con nombre', async () => {
    (Guest.count as jest.Mock).mockResolvedValue(2);
    const result = await service.importParticipants('event', null, [{ documentNumber: '11111111-1', guestLoads: 3 }], 'user');
    expect(result.errors[0].error).toContain('invitados con nombre');
    expect(existing.update).not.toHaveBeenCalled();
  });
  test('una cantidad inválida no crea participantes y revierte la fila', async () => {
    (Participant.findOne as jest.Mock).mockResolvedValue(null);
    const result = await service.importParticipants('event', null, [{ documentNumber: '11111111-1', guestLoads: -1 }], 'user');
    expect(result.errors).toHaveLength(1);
    expect(Participant.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });
});
