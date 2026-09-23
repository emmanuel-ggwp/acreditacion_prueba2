import { GuestService } from '../guestService';
import { Participant, Guest, Accreditation, AuditLog } from '@/models/index';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const GuestMock = Guest as jest.Mocked<typeof Guest>;
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const AuditLogMock = AuditLog as jest.Mocked<typeof AuditLog>;

// GUIDs válidos (guestSchema exige id y participantId como guid).
const GUEST_ID = '123e4567-e89b-12d3-a456-426614174010';
const PARTICIPANT_ID = '123e4567-e89b-12d3-a456-426614174011';

describe('GuestService', () => {
  let service: GuestService;

  beforeEach(() => {
    service = new GuestService();
    jest.clearAllMocks();
  });

  describe('addGuest', () => {
    const validGuestData = {
      id: GUEST_ID,
      participantId: PARTICIPANT_ID,
      firstName: 'Juan',
      lastName: 'Perez',
    };

    const makeParticipant = (over: any = {}) => ({
      id: PARTICIPANT_ID,
      allowedGuests: 5,
      guests: [],
      event: { allowGuests: true },
      schedules: [{ id: 's1' }, { id: 's2' }],
      ...over,
    });

    it('agrega un invitado y lo liga a las fechas del participante', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(makeParticipant());
      const createdGuest: any = { id: 'guest-1', firstName: 'Juan', lastName: 'Perez', addSchedules: jest.fn().mockResolvedValue(undefined) };
      (GuestMock.create as jest.Mock).mockResolvedValue(createdGuest);

      const result = await service.addGuest(PARTICIPANT_ID, validGuestData as any, 'user-1');

      expect(GuestMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Juan', lastName: 'Perez', participantId: PARTICIPANT_ID }),
      );
      expect(createdGuest.addSchedules).toHaveBeenCalledWith([{ id: 's1' }, { id: 's2' }]);
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(createdGuest);
    });

    it('no llama a addSchedules si el participante no tiene fechas', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(makeParticipant({ schedules: [] }));
      const createdGuest: any = { id: 'guest-1', firstName: 'Juan', addSchedules: jest.fn() };
      (GuestMock.create as jest.Mock).mockResolvedValue(createdGuest);

      await service.addGuest(PARTICIPANT_ID, validGuestData as any);

      expect(createdGuest.addSchedules).not.toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled(); // sin userId
    });

    it('permite agregar cuando el participante no trae evento cargado', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(makeParticipant({ event: null, schedules: [] }));
      const createdGuest: any = { id: 'guest-1', firstName: 'Juan', addSchedules: jest.fn() };
      (GuestMock.create as jest.Mock).mockResolvedValue(createdGuest);

      const result = await service.addGuest(PARTICIPANT_ID, validGuestData as any);

      expect(result).toBe(createdGuest);
      expect(GuestMock.create).toHaveBeenCalled();
    });

    it('lanza error si el participante no existe', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.addGuest(PARTICIPANT_ID, validGuestData as any)).rejects.toThrow(
        'Participant not found',
      );
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('lanza error si el evento no permite invitados', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(
        makeParticipant({ event: { allowGuests: false } }),
      );

      await expect(service.addGuest(PARTICIPANT_ID, validGuestData as any)).rejects.toThrow(
        'This event does not allow guests.',
      );
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('lanza error al alcanzar el máximo de invitados', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(
        makeParticipant({ allowedGuests: 2, guests: [{ id: 'g1' }, { id: 'g2' }] }),
      );

      await expect(service.addGuest(PARTICIPANT_ID, validGuestData as any)).rejects.toThrow(
        'Participant has reached the maximum number of guests.',
      );
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('rechaza datos de invitado inválidos (validación Zod)', async () => {
      await expect(
        service.addGuest(PARTICIPANT_ID, { id: GUEST_ID, participantId: PARTICIPANT_ID } as any),
      ).rejects.toThrow();
      expect(ParticipantMock.findByPk).not.toHaveBeenCalled();
    });

    it('tolera un participante sin colecciones cargadas (guests/schedules ausentes)', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({
        id: PARTICIPANT_ID,
        allowedGuests: 5,
        event: { allowGuests: true },
        // sin `guests` ni `schedules`
      });
      const createdGuest: any = { id: 'guest-1', firstName: 'Juan', addSchedules: jest.fn() };
      (GuestMock.create as jest.Mock).mockResolvedValue(createdGuest);

      const result = await service.addGuest(PARTICIPANT_ID, validGuestData as any);

      expect(result).toBe(createdGuest);
      expect(createdGuest.addSchedules).not.toHaveBeenCalled();
    });
  });

  describe('updateGuest', () => {
    const makeGuest = (init: any = {}) => {
      const data: any = { id: GUEST_ID, firstName: 'Old', lastName: 'Name', ...init };
      const g: any = {
        ...data,
        get: jest.fn(() => ({ ...data })),
        update: jest.fn(async (patch: any) => {
          Object.assign(data, patch);
          Object.assign(g, patch);
          return g;
        }),
      };
      return g;
    };

    it('actualiza el invitado y registra cambios en auditoría', async () => {
      const guest = makeGuest();
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      const result = await service.updateGuest(GUEST_ID, { firstName: 'Nuevo' } as any, 'user-1');

      expect(guest.update).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Nuevo' }));
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(guest);
    });

    it('actualiza sin auditar cuando no hay userId', async () => {
      const guest = makeGuest();
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      await service.updateGuest(GUEST_ID, { firstName: 'Nuevo' } as any);

      expect(guest.update).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });

    it('lanza error si el invitado no existe', async () => {
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.updateGuest(GUEST_ID, { firstName: 'X' } as any)).rejects.toThrow(
        'Guest not found',
      );
    });

    it('rechaza datos inválidos (validación Zod)', async () => {
      await expect(
        service.updateGuest(GUEST_ID, { email: 'no-es-correo' } as any),
      ).rejects.toThrow();
      expect(GuestMock.findByPk).not.toHaveBeenCalled();
    });

    it('no audita cuando el valor no cambia', async () => {
      const guest = makeGuest({ firstName: 'Old' });
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      await service.updateGuest(GUEST_ID, { firstName: 'Old' } as any, 'user-1');

      expect(guest.update).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteGuest', () => {
    const makeGuest = () => ({
      id: GUEST_ID,
      firstName: 'Juan',
      lastName: 'Perez',
      setSchedules: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    });

    it('elimina el invitado limpiando sus fechas', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      const guest = makeGuest();
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      const result = await service.deleteGuest(GUEST_ID, 'user-1', 'motivo');

      expect(guest.setSchedules).toHaveBeenCalledWith([]);
      expect(guest.destroy).toHaveBeenCalled();
      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Guest deleted successfully' });
    });

    it('audita sin motivo cuando no se indica razón', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      const guest = makeGuest();
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      await service.deleteGuest(GUEST_ID, 'user-1');

      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.reason).toBeNull();
    });

    it('lanza error si el invitado tiene acreditaciones', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(3);

      await expect(service.deleteGuest(GUEST_ID)).rejects.toThrow(
        'Cannot delete guest with existing accreditations.',
      );
      expect(GuestMock.findByPk).not.toHaveBeenCalled();
    });

    it('lanza error si el invitado no existe', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteGuest(GUEST_ID)).rejects.toThrow('Guest not found');
    });

    it('elimina sin auditar cuando no hay userId (invitado sin apellido)', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      const guest = {
        id: GUEST_ID,
        firstName: 'Solo',
        lastName: null,
        setSchedules: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(guest);

      const result = await service.deleteGuest(GUEST_ID);

      expect(guest.setSchedules).toHaveBeenCalledWith([]);
      expect(guest.destroy).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Guest deleted successfully' });
    });
  });

  describe('listGuestsByParticipant', () => {
    it('devuelve los invitados del participante', async () => {
      const rows = [{ id: 'g1' }, { id: 'g2' }];
      (GuestMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.listGuestsByParticipant(PARTICIPANT_ID);

      expect(GuestMock.findAll).toHaveBeenCalledWith({ where: { participantId: PARTICIPANT_ID } });
      expect(result).toBe(rows);
    });
  });
});
