import { TicketService } from '../ticketService';
import { sequelize } from '@/lib/sequelize';
import { Participant, Event, EventSchedule, Accreditation, TicketDelivery, AuditLog } from '@/models/index';

describe('TicketService', () => {
  const service = new TicketService();
  const tx = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } };
  const participant = { id: 'p1', eventId: 'e1', firstName: 'Ana', lastName: 'Pérez' };
  const event = { id: 'e1', isActive: true, registrationConfig: { tickets: { maxPerParticipant: 5 } } };

  beforeEach(() => {
    jest.resetAllMocks();
    (sequelize.transaction as jest.Mock).mockImplementation(async (callback: any) => callback(tx));
    (Participant.findByPk as jest.Mock).mockResolvedValue(participant);
    (EventSchedule.findByPk as jest.Mock).mockResolvedValue({ id: 's1', eventId: 'e1', isActive: true });
    (EventSchedule.findOne as jest.Mock).mockResolvedValue({ id: 's1', eventId: 'e1' });
    (Event.findByPk as jest.Mock).mockResolvedValue(event);
    (Accreditation.findOne as jest.Mock).mockResolvedValue({ id: 'a1' });
    (TicketDelivery.findOne as jest.Mock).mockResolvedValue(null);
    (TicketDelivery.create as jest.Mock).mockResolvedValue({ id: 't1', quantity: 3 });
  });

  it('registra la cantidad, fecha, responsable y auditoría sin modificar la acreditación', async () => {
    await expect(service.deliver('p1', 's1', 3, 'u1')).resolves.toEqual({ id: 't1', quantity: 3 });
    expect(Participant.findByPk).toHaveBeenCalledWith('p1', { transaction: tx, lock: 'UPDATE' });
    expect(Event.findByPk).toHaveBeenCalledWith('e1', { transaction: tx, lock: 'SHARE' });
    expect(TicketDelivery.create).toHaveBeenCalledWith({ participantId: 'p1', scheduleId: 's1', quantity: 3, deliveredBy: 'u1', deliveredAt: expect.any(Date) }, { transaction: tx });
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ entity: 'TicketDelivery', eventId: 'e1', userId: 'u1' }));
    expect(Accreditation.create).not.toHaveBeenCalled();
    expect(Accreditation.destroy).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 10001])('rechaza cantidad inválida %s antes de abrir una transacción', async (quantity) => {
    await expect(service.deliver('p1', 's1', quantity, 'u1')).rejects.toThrow('entero positivo');
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rechaza cantidades que superan el máximo del evento', async () => {
    await expect(service.deliver('p1', 's1', 6, 'u1')).rejects.toThrow('máximo por participante es 5');
    expect(TicketDelivery.create).not.toHaveBeenCalled();
  });

  it.each([null, {}, { tickets: { maxPerParticipant: 0 } }])('no habilita eventos existentes sin tope positivo: %s', async (registrationConfig) => {
    (Event.findByPk as jest.Mock).mockResolvedValue({ ...event, registrationConfig });
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('no está habilitada');
    expect(TicketDelivery.create).not.toHaveBeenCalled();
  });

  it('requiere acreditación en la fecha seleccionada', async () => {
    (Accreditation.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('Primero debes acreditar');
    expect(Accreditation.findOne).toHaveBeenCalledWith({ where: { participantId: 'p1', eventScheduleId: 's1' }, transaction: tx });
    expect(TicketDelivery.create).not.toHaveBeenCalled();
  });

  it('impide otra entrega aunque haya cambiado la fecha o se haya eliminado la acreditación', async () => {
    (TicketDelivery.findOne as jest.Mock).mockResolvedValue({ id: 't0', scheduleId: 'otra-fecha', quantity: 2 });
    (Accreditation.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.deliver('p1', 's1', 2, 'u1')).rejects.toMatchObject({ statusCode: 409 });
    expect(TicketDelivery.findOne).toHaveBeenCalledWith({ where: { participantId: 'p1' }, transaction: tx });
    expect(TicketDelivery.create).not.toHaveBeenCalled();
  });

  it('rechaza un participante de otro evento', async () => {
    (Participant.findByPk as jest.Mock).mockResolvedValue({ ...participant, eventId: 'otro' });
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('no pertenece');
    expect(TicketDelivery.create).not.toHaveBeenCalled();
  });

  it('rechaza participante o fecha inexistente', async () => {
    (EventSchedule.findByPk as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toMatchObject({ statusCode: 404 });
    (Participant.findByPk as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rechaza eventos inactivos y fechas canceladas', async () => {
    (Event.findByPk as jest.Mock).mockResolvedValueOnce({ ...event, isActive: false });
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('no están activos');
    (EventSchedule.findByPk as jest.Mock).mockResolvedValueOnce({ id: 's1', eventId: 'e1', isActive: true, status: 'cancelled' });
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('no están activos');
  });

  it('no registra auditoría de éxito si falla la creación', async () => {
    (TicketDelivery.create as jest.Mock).mockRejectedValue(new Error('falló la BD'));
    await expect(service.deliver('p1', 's1', 1, 'u1')).rejects.toThrow('falló la BD');
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it('consulta una entrega anterior aun cuando se haya desactivado la opción', async () => {
    (Event.findByPk as jest.Mock).mockResolvedValue({ ...event, registrationConfig: {} });
    (TicketDelivery.findOne as jest.Mock).mockResolvedValue({ id: 't1', quantity: 2 });
    (Accreditation.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.getStatus('p1', 's1')).resolves.toEqual({ maxPerParticipant: 0, isAccredited: false, delivery: { id: 't1', quantity: 2 } });
  });

  it('no permite consultar una fecha ajena', async () => {
    (EventSchedule.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.getStatus('p1', 'otra')).rejects.toMatchObject({ statusCode: 404 });
    expect(TicketDelivery.findOne).not.toHaveBeenCalled();
  });
});
