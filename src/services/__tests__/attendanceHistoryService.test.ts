import { Op } from 'sequelize';
import { AttendanceHistoryService } from '../attendanceHistoryService';
import { Accreditation, EventSchedule, Participant, Guest } from '@/models/index';

const historyRow = (id: string, scheduleId: string, label: string, checkInTime: string) => ({
  get: () => ({ id, eventScheduleId: scheduleId, checkInTime,
    EventSchedule: { id: scheduleId, label, scheduleName: 'Nombre alternativo', startDateTime: '2026-11-07T12:00:00Z' } }),
});

describe('AttendanceHistoryService', () => {
  const service = new AttendanceHistoryService();
  beforeEach(() => {
    jest.resetAllMocks();
    (EventSchedule.findByPk as jest.Mock).mockResolvedValue({ id: 'hoy', eventId: 'e1' });
    (Participant.findByPk as jest.Mock).mockResolvedValue({ id: 'p1', eventId: 'e1' });
    (Guest.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', participantId: 'p1' });
    (Accreditation.findAll as jest.Mock).mockResolvedValue([]);
  });

  it('sin asistencias previas devuelve una lista vacía', async () => {
    await expect(service.getHistory('participant', 'p1', 'hoy')).resolves.toEqual([]);
  });

  it('muestra todas las fechas previas con su nombre y hora, no solo la última', async () => {
    (Accreditation.findAll as jest.Mock).mockResolvedValue([
      historyRow('a2', 's2', 'Navidad segundo turno', '2026-11-07T18:00:00Z'),
      historyRow('a1', 's1', 'Navidad primer turno', '2026-11-07T15:00:00Z'),
    ]);
    const history = await service.getHistory('participant', 'p1', 'hoy');
    expect(history.map((entry) => entry.scheduleName)).toEqual(['Navidad segundo turno', 'Navidad primer turno']);
    expect(history[1]).toMatchObject({ id: 'a1', scheduleId: 's1', checkInTime: '2026-11-07T15:00:00Z' });
    expect(Accreditation.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { participantId: 'p1', eventScheduleId: { [Op.ne]: 'hoy' } },
      include: [expect.objectContaining({ model: EventSchedule, required: true, where: { eventId: 'e1' } })],
      order: [['checkInTime', 'DESC'], ['id', 'ASC']],
    }));
    expect(Accreditation.create).not.toHaveBeenCalled();
    expect(Accreditation.destroy).not.toHaveBeenCalled();
  });

  it('consulta el historial propio del invitado, no el de su titular', async () => {
    (Accreditation.findAll as jest.Mock).mockResolvedValue([historyRow('ga1', 's1', 'Primer turno', '2026-11-07T15:00:00Z')]);
    const result = await service.getHistory('guest', 'g1', 'hoy');
    expect(result).toHaveLength(1);
    expect(Guest.findByPk).toHaveBeenCalledWith('g1');
    expect(Participant.findByPk).toHaveBeenCalledWith('p1');
    expect(Accreditation.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { guestId: 'g1', eventScheduleId: { [Op.ne]: 'hoy' } },
    }));
  });

  it('no confunde inscripción con asistencia', async () => {
    (Participant.findByPk as jest.Mock).mockResolvedValue({ id: 'p1', eventId: 'e1', schedules: [{ id: 'inscrito-otra-fecha' }] });
    await expect(service.getHistory('participant', 'p1', 'hoy')).resolves.toEqual([]);
  });

  it('consulta de nuevo y refleja la eliminación de una acreditación', async () => {
    (Accreditation.findAll as jest.Mock).mockResolvedValueOnce([historyRow('a1', 's1', 'Primer turno', '2026-11-07T15:00:00Z')]);
    expect(await service.getHistory('participant', 'p1', 'hoy')).toHaveLength(1);
    expect(await service.getHistory('participant', 'p1', 'hoy')).toHaveLength(0);
  });

  it('usa el nombre de la fecha si no existe una etiqueta', async () => {
    (Accreditation.findAll as jest.Mock).mockResolvedValue([historyRow('a1', 's1', '', '2026-11-07T15:00:00Z')]);
    expect((await service.getHistory('participant', 'p1', 'hoy'))[0].scheduleName).toBe('Nombre alternativo');
  });

  it('rechaza personas de otro evento sin consultar sus acreditaciones', async () => {
    (Participant.findByPk as jest.Mock).mockResolvedValue({ id: 'p1', eventId: 'otro-evento' });
    await expect(service.getHistory('participant', 'p1', 'hoy')).rejects.toMatchObject({ statusCode: 404 });
    expect(Accreditation.findAll).not.toHaveBeenCalled();
  });

  it('rechaza fecha, titular o invitado inexistentes', async () => {
    (EventSchedule.findByPk as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getHistory('participant', 'p1', 'no-existe')).rejects.toMatchObject({ statusCode: 404 });
    (Participant.findByPk as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getHistory('participant', 'no-existe', 'hoy')).rejects.toMatchObject({ statusCode: 404 });
    (Guest.findByPk as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getHistory('guest', 'no-existe', 'hoy')).rejects.toMatchObject({ statusCode: 404 });
  });
});
