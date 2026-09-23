// jest.setup.js mockea @/lib/sequelize como módulo VIRTUAL (keyed por el string "@/lib/sequelize").
// Pero reportService.ts lo importa por ruta RELATIVA ('../lib/sequelize'), que se resuelve al
// archivo real y NO al mock virtual, por lo que la suite ni siquiera cargaría (el módulo real
// revienta sin BD). Por eso mockeamos aquí la MISMA ruta resuelta (src/lib/sequelize) para que
// tanto el servicio como este test compartan exactamente la misma instancia mockeada.
jest.mock('../../lib/sequelize', () => ({
  sequelize: {
    query: jest.fn(),
    literal: jest.fn((v) => v),
    fn: jest.fn(),
    col: jest.fn(),
    where: jest.fn(),
    transaction: jest.fn(),
    getQueryInterface: jest.fn(() => ({})),
  },
}));

import { ReportService, reportService } from '../reportService';
import { sequelize } from '../../lib/sequelize';
import {
  Event,
  EventSchedule,
  Participant,
  ParticipantSchedule,
  Accreditation,
  ParticipantAward,
} from '@/models/index';

// Los modelos y @/lib/sequelize ya están mockeados globalmente por jest.setup.js.
// Aquí solo los tipamos como mocks y los configuramos por test.
const EventMock = Event as jest.Mocked<typeof Event>;
const EventScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const ParticipantScheduleMock = ParticipantSchedule as jest.Mocked<typeof ParticipantSchedule>;
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const ParticipantAwardMock = ParticipantAward as jest.Mocked<typeof ParticipantAward>;
const queryMock = sequelize.query as jest.Mock;

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
    // resetAllMocks garantiza que no se filtren valores encolados con mockResolvedValueOnce
    // entre tests. reportService no usa sequelize.transaction ni literal/fn/col del mock
    // (esos vienen del paquete real 'sequelize'), así que no hace falta re-configurar nada global.
    jest.resetAllMocks();
  });

  describe('getEventReport', () => {
    const eventId = 'event-1';

    it('debe lanzar error si el evento no existe', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.getEventReport(eventId)).rejects.toThrow('Event not found');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('devuelve la estructura vacía cuando el evento no tiene fechas', async () => {
      const event = { id: eventId, name: 'Evento Sin Fechas', maxCapacity: 100 };
      (EventMock.findByPk as jest.Mock).mockResolvedValue(event);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getEventReport(eventId);

      expect(result).toEqual({
        eventInfo: event,
        participantStats: {
          registered: 0,
          registeredGuests: 0,
          totalRegistered: 0,
          totalAccredited: 0,
          accredited: 0,
          accreditedGuests: 0,
          attendanceRate: 0,
        },
        scheduleStats: [],
        awardStats: { assigned: 0, delivered: 0, deliveryRate: 0, pending: 0 },
        accreditationTimeline: [],
      });
      // No debe seguir consultando cuando no hay fechas.
      expect(queryMock).not.toHaveBeenCalled();
      expect(ParticipantMock.count).not.toHaveBeenCalled();
    });

    it('construye el reporte completo con estadísticas por fecha, evento y timeline', async () => {
      const event = { id: eventId, name: 'Evento Uno', maxCapacity: 100 };

      const s1Start = new Date(2026, 8, 20, 9, 0);
      const s1End = new Date(2026, 8, 20, 12, 0);
      const s2Start = new Date(2026, 8, 20, 14, 0);
      const s2End = new Date(2026, 8, 20, 17, 0);

      const s1 = { id: 'sch-1', scheduleName: 'Mañana', startDateTime: s1Start, endDateTime: s1End, maxCapacity: 50, maxAttendees: 80 };
      const s2 = { id: 'sch-2', scheduleName: 'Tarde', startDateTime: s2Start, endDateTime: s2End, maxCapacity: null, maxAttendees: null };

      (EventMock.findByPk as jest.Mock).mockResolvedValue(event);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([s1, s2]);

      // Accreditation.findAll: 1) conteos por fecha  2) timeline (checkInTime ordenado).
      const acc1 = { checkInTime: new Date(2026, 8, 20, 10, 15) };
      const acc2 = { checkInTime: new Date(2026, 8, 20, 10, 45) };
      const acc3 = { checkInTime: new Date(2026, 8, 20, 11, 5) };
      (AccreditationMock.findAll as jest.Mock)
        .mockResolvedValueOnce([
          { eventScheduleId: 'sch-1', total: 10, participants: 8, guests: 2, numericGuests: 3 },
          { eventScheduleId: 'sch-2', total: 5, participants: 5, guests: 0, numericGuests: 0 },
        ])
        .mockResolvedValueOnce([acc1, acc2, acc3]);

      (ParticipantScheduleMock.findAll as jest.Mock).mockResolvedValue([
        { scheduleId: 'sch-1', count: 12 },
        { scheduleId: 'sch-2', count: 6 },
      ]);

      // 6 llamadas a sequelize.query en orden:
      // 1) invitados con nombre reg. por fecha  2) invitados numéricos reg. por fecha
      // 3) premios entregados por fecha         4) invitados con nombre del evento
      // 5) invitados numéricos del evento       6) invitados numéricos acreditados del evento
      queryMock
        .mockResolvedValueOnce([{ scheduleId: 'sch-1', count: 4 }])
        .mockResolvedValueOnce([{ scheduleId: 'sch-1', count: 5 }])
        .mockResolvedValueOnce([{ scheduleId: 'sch-1', count: 2 }])
        .mockResolvedValueOnce([{ count: 6 }])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ count: 3 }]);

      (ParticipantMock.count as jest.Mock).mockResolvedValue(15);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue({ uniqueParticipants: '13', uniqueGuests: '2' });
      (ParticipantAwardMock.count as jest.Mock)
        .mockResolvedValueOnce(10) // asignados
        .mockResolvedValueOnce(4); // entregados

      const result = await service.getEventReport(eventId);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId);
      expect(queryMock).toHaveBeenCalledTimes(6);

      expect(result.eventInfo).toBe(event);

      expect(result.scheduleStats).toEqual([
        {
          scheduleName: 'Mañana',
          startDateTime: s1Start,
          endDateTime: s1End,
          capacity: 50,
          maxAttendees: 80,
          registered: 21,
          registeredTotal: 21,
          registeredParticipants: 12,
          registeredGuests: 9,
          accreditedTotal: 13,
          accreditedParticipants: 8,
          accreditedGuests: 5,
          awardsDelivered: 2,
          capacityUsedPercentage: 16,
        },
        {
          scheduleName: 'Tarde',
          startDateTime: s2Start,
          endDateTime: s2End,
          capacity: 100, // fallback al maxCapacity del evento
          maxAttendees: null,
          registered: 6,
          registeredTotal: 6,
          registeredParticipants: 6,
          registeredGuests: 0,
          accreditedTotal: 5,
          accreditedParticipants: 5,
          accreditedGuests: 0,
          awardsDelivered: 0,
          capacityUsedPercentage: 5,
        },
      ]);

      expect(result.participantStats).toEqual({
        registered: 15,
        registeredGuests: 16, // 6 con nombre + 10 numéricos
        totalRegistered: 31,
        totalAccredited: 18, // 13 participantes + (2 con nombre + 3 numéricos)
        accredited: 13,
        accreditedGuests: 5,
        attendanceRate: expect.closeTo(58.0645, 3),
      });

      expect(result.awardStats).toEqual({
        assigned: 10,
        delivered: 4,
        deliveryRate: 40,
        pending: 6,
      });

      // Timeline: acc1+acc2 caen en la hora 10:00, acc3 en 11:00.
      expect(result.accreditationTimeline).toHaveLength(2);
      expect(result.accreditationTimeline.map((t) => t.count)).toEqual([2, 1]);
    });

    it('maneja fechas existentes pero sin datos (todo en cero)', async () => {
      // Sin cupo en la fecha ni en el evento -> capacity cae a 0 (rama `?? 0`) y el
      // porcentaje usa la rama `capacity > 0 ? ... : 0`.
      const event = { id: eventId, name: 'Evento Vacío', maxCapacity: null };
      const s1 = { id: 'sch-1', scheduleName: 'Única', startDateTime: new Date(2026, 8, 20, 9, 0), endDateTime: new Date(2026, 8, 20, 12, 0), maxCapacity: null, maxAttendees: null };
      // s2 con cupo pero sin acreditados: cubre la rama `capacity > 0 ? ...` y el `|| 0`
      // de participantes acreditados en 0.
      const s2 = { id: 'sch-2', scheduleName: 'Segunda', startDateTime: new Date(2026, 8, 20, 14, 0), endDateTime: new Date(2026, 8, 20, 17, 0), maxCapacity: 50, maxAttendees: 10 };

      (EventMock.findByPk as jest.Mock).mockResolvedValue(event);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([s1, s2]);
      (AccreditationMock.findAll as jest.Mock).mockResolvedValue([]); // conteos y timeline vacíos
      (ParticipantScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      queryMock.mockResolvedValue([]); // las 6 consultas vacías
      (ParticipantMock.count as jest.Mock).mockResolvedValue(0);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getEventReport(eventId);

      expect(result.scheduleStats).toEqual([
        {
          scheduleName: 'Única',
          startDateTime: s1.startDateTime,
          endDateTime: s1.endDateTime,
          capacity: 0,
          maxAttendees: null,
          registered: 0,
          registeredTotal: 0,
          registeredParticipants: 0,
          registeredGuests: 0,
          accreditedTotal: 0,
          accreditedParticipants: 0,
          accreditedGuests: 0,
          awardsDelivered: 0,
          capacityUsedPercentage: 0,
        },
        {
          scheduleName: 'Segunda',
          startDateTime: s2.startDateTime,
          endDateTime: s2.endDateTime,
          capacity: 50,
          maxAttendees: 10,
          registered: 0,
          registeredTotal: 0,
          registeredParticipants: 0,
          registeredGuests: 0,
          accreditedTotal: 0,
          accreditedParticipants: 0,
          accreditedGuests: 0,
          awardsDelivered: 0,
          capacityUsedPercentage: 0,
        },
      ]);
      expect(result.participantStats).toEqual({
        registered: 0,
        registeredGuests: 0,
        totalRegistered: 0,
        totalAccredited: 0,
        accredited: 0,
        accreditedGuests: 0,
        attendanceRate: 0,
      });
      expect(result.awardStats).toEqual({ assigned: 0, delivered: 0, deliveryRate: 0, pending: 0 });
      expect(result.accreditationTimeline).toEqual([]);
    });
  });

  describe('getDashboardStats', () => {
    it('devuelve estadísticas del evento cuando se pasa un eventId', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: 5, name: 'Evento X' });
      (AccreditationMock.count as jest.Mock).mockResolvedValue(40);
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(7);
      (ParticipantMock.count as jest.Mock).mockResolvedValue(120);

      const result = await service.getDashboardStats(5);

      expect(EventMock.findByPk).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        eventName: 'Evento X',
        totalParticipants: 120,
        totalAccredited: 40,
        awardsPending: 7,
      });
    });

    it('lanza error si el evento no existe (con eventId)', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.getDashboardStats(99)).rejects.toThrow('Event not found');
    });

    it('devuelve estadísticas globales cuando no se pasa eventId', async () => {
      (EventMock.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalEvents
        .mockResolvedValueOnce(6); // activeEvents
      (ParticipantMock.count as jest.Mock).mockResolvedValue(200);
      (AccreditationMock.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalEvents: 10,
        activeEvents: 6,
        totalParticipants: 200,
        accreditationsToday: 15,
      });
      expect(EventMock.count).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRealTimeStats', () => {
    const eventId = 'event-1';

    it('calcula acreditados recientes, capacidad y ritmo por minuto', async () => {
      const fixedNow = new Date('2026-09-23T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
      try {
        const s1 = { id: 'sch-1', scheduleName: 'Mañana', maxCapacity: 50, Event: { maxCapacity: 100 } };
        const s2 = { id: 'sch-2', scheduleName: 'Tarde', maxCapacity: null, Event: { maxCapacity: 100 } };

        (AccreditationMock.count as jest.Mock)
          .mockResolvedValueOnce(5) // últimos 30 min
          .mockResolvedValueOnce(20) // acreditados sch-1
          .mockResolvedValueOnce(10) // acreditados sch-2
          .mockResolvedValueOnce(30); // total acreditados (para el ritmo)
        (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([s1, s2]);
        (AccreditationMock.findOne as jest.Mock).mockResolvedValue({
          checkInTime: new Date('2026-09-23T11:00:00.000Z'), // 60 min antes
        });

        const result = await service.getRealTimeStats(eventId);

        expect(result.accreditationsLast30Min).toBe(5);
        expect(result.currentCapacity).toEqual([
          { scheduleName: 'Mañana', capacity: 50, accredited: 20, available: 30 },
          { scheduleName: 'Tarde', capacity: 100, accredited: 10, available: 90 },
        ]);
        // 30 acreditados / 60 min = 0.5 por minuto.
        expect(result.accreditationRatePerMinute).toBeCloseTo(0.5, 5);
      } finally {
        jest.useRealTimers();
      }
    });

    it('sin fechas activas ni primera acreditación devuelve ritmo 0 y capacidad vacía', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(3);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getRealTimeStats(eventId);

      expect(result).toEqual({
        accreditationsLast30Min: 3,
        currentCapacity: [],
        accreditationRatePerMinute: 0,
      });
      // Solo se contó una vez (últimos 30 min); sin fechas ni primera acreditación no hay más counts.
      expect(AccreditationMock.count).toHaveBeenCalledTimes(1);
    });

    it('con capacidad 0 la disponibilidad es Infinity', async () => {
      const s = { id: 'sch-3', scheduleName: 'Noche', maxCapacity: null, Event: { maxCapacity: null } };
      (AccreditationMock.count as jest.Mock)
        .mockResolvedValueOnce(0) // últimos 30 min
        .mockResolvedValueOnce(0); // acreditados sch-3
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([s]);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getRealTimeStats(eventId);

      expect(result.currentCapacity).toEqual([
        { scheduleName: 'Noche', capacity: 0, accredited: 0, available: Infinity },
      ]);
      expect(result.accreditationRatePerMinute).toBe(0);
    });

    it('si el tiempo transcurrido es 0 el ritmo permanece en 0', async () => {
      const fixedNow = new Date('2026-09-23T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
      try {
        (AccreditationMock.count as jest.Mock)
          .mockResolvedValueOnce(2) // últimos 30 min
          .mockResolvedValueOnce(5); // total acreditados
        (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
        (AccreditationMock.findOne as jest.Mock).mockResolvedValue({ checkInTime: fixedNow });

        const result = await service.getRealTimeStats(eventId);

        expect(result.accreditationRatePerMinute).toBe(0);
        // El total sí se consulta aunque el ritmo no se calcule.
        expect(AccreditationMock.count).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getGeneralReport', () => {
    const eventId = 'event-1';

    it('mapea y formatea las filas del reporte general', async () => {
      const row = {
        Nombre: 'Juan',
        Apellido: 'Pérez',
        Documento: '12345',
        'Número SAP': 'SAP1',
        Empresa: 'ACME',
        Cargo: 'Dev',
        Teléfono: '555',
        Email: 'j@e.com',
        Dieta: 'Veg',
        'Comentarios Dieta': 'sin gluten',
        registrationDate: new Date(2026, 8, 20, 14, 30),
        eventDate: new Date(2026, 8, 20),
        Asistencia: 'Sí',
        checkInTime: new Date(2026, 8, 20, 9, 5, 30),
        'Cant. Invitados': 2,
        'Cant. Invitados Asistentes': 1,
        guestsDetail: 'Ana · 999 · 10 años',
        awardName: 'Premio A',
      };
      queryMock.mockResolvedValue([row]);

      const result = await service.getGeneralReport(eventId);

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM participants'),
        expect.objectContaining({ replacements: { eventId } })
      );
      expect(result).toEqual([
        {
          Nombre: 'Juan',
          Apellido: 'Pérez',
          Documento: '12345',
          'Número SAP': 'SAP1',
          Empresa: 'ACME',
          Cargo: 'Dev',
          Teléfono: '555',
          Email: 'j@e.com',
          Dieta: 'Veg',
          'Comentarios Dieta': 'sin gluten',
          'Fecha Inscripción': '20/09/2026 14:30',
          'Fecha Evento': '20/09/2026',
          Asistencia: 'Sí',
          'Hora Acreditación': '09:05:30',
          'Cant. Invitados': 2,
          'Cant. Invitados Asistentes': 1,
          'Invitados (detalle)': 'Ana · 999 · 10 años',
          Premio: 'Premio A',
        },
      ]);
    });

    it('usa valores por defecto cuando faltan fechas, invitados y premio', async () => {
      const row = {
        Nombre: 'Sin',
        Apellido: 'Datos',
        Documento: null,
        'Número SAP': null,
        Empresa: null,
        Cargo: null,
        Teléfono: null,
        Email: null,
        Dieta: null,
        'Comentarios Dieta': null,
        registrationDate: null,
        eventDate: null,
        Asistencia: 'No',
        checkInTime: null,
        'Cant. Invitados': 0,
        'Cant. Invitados Asistentes': 0,
        guestsDetail: null,
        awardName: null,
      };
      queryMock.mockResolvedValue([row]);

      const result = await service.getGeneralReport(eventId);

      expect(result[0]['Fecha Inscripción']).toBe('');
      expect(result[0]['Fecha Evento']).toBe('');
      expect(result[0]['Hora Acreditación']).toBe('');
      expect(result[0]['Invitados (detalle)']).toBe('');
      expect(result[0].Premio).toBe('No');
    });

    it('devuelve arreglo vacío si no hay filas', async () => {
      queryMock.mockResolvedValue([]);

      const result = await service.getGeneralReport(eventId);

      expect(result).toEqual([]);
    });
  });

  describe('getGuestsReport', () => {
    const eventId = 'event-1';

    it('mapea invitados de tipo CARGA con dieta y hora formateada', async () => {
      const row = {
        Participante: 'Juan Pérez',
        Invitado: 'Ana Pérez',
        RUT: '999',
        Edad: 10,
        Tipo: 'CARGA',
        Dieta: 'VEGETARIAN',
        Asistió: 'Sí',
        checkInTime: new Date(2026, 8, 20, 9, 5),
      };
      queryMock.mockResolvedValue([row]);

      const result = await service.getGuestsReport(eventId);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM guests'),
        expect.objectContaining({ replacements: { eventId } })
      );
      expect(result).toEqual([
        {
          Participante: 'Juan Pérez',
          Invitado: 'Ana Pérez',
          RUT: '999',
          Edad: 10,
          Tipo: 'Carga',
          Dieta: 'VEGETARIAN',
          Asistió: 'Sí',
          'Hora Acreditación': '20/09/2026 09:05',
        },
      ]);
    });

    it('normaliza ACOMPANANTE, oculta dieta NONE y respeta edad 0 sin acreditación', async () => {
      const row = {
        Participante: 'Luis Soto',
        Invitado: 'Bebé Soto',
        RUT: null,
        Edad: 0,
        Tipo: 'ACOMPANANTE',
        Dieta: 'NONE',
        Asistió: 'No',
        checkInTime: null,
      };
      queryMock.mockResolvedValue([row]);

      const result = await service.getGuestsReport(eventId);

      expect(result[0]).toEqual({
        Participante: 'Luis Soto',
        Invitado: 'Bebé Soto',
        RUT: '',
        Edad: 0, // ?? conserva el 0
        Tipo: 'Acompañante',
        Dieta: '', // NONE se oculta
        Asistió: 'No',
        'Hora Acreditación': '',
      });
    });

    it('deja el tipo tal cual para valores desconocidos y vacío si es nulo', async () => {
      queryMock.mockResolvedValue([
        { Participante: 'A', Invitado: 'B', RUT: 'r', Edad: null, Tipo: 'OTRO', Dieta: 'CELIACO', Asistió: 'Sí', checkInTime: null },
        { Participante: 'C', Invitado: 'D', RUT: 'r2', Edad: 5, Tipo: null, Dieta: null, Asistió: 'No', checkInTime: null },
      ]);

      const result = await service.getGuestsReport(eventId);

      expect(result[0].Tipo).toBe('OTRO');
      expect(result[0].Edad).toBe(''); // null -> ''
      expect(result[0].Dieta).toBe('CELIACO');
      expect(result[1].Tipo).toBe('');
      expect(result[1].Dieta).toBe('');
    });

    it('devuelve arreglo vacío si no hay invitados', async () => {
      queryMock.mockResolvedValue([]);

      const result = await service.getGuestsReport(eventId);

      expect(result).toEqual([]);
    });
  });

  describe('generateCsv', () => {
    it('devuelve cadena vacía para un arreglo vacío', async () => {
      await expect(service.generateCsv([])).resolves.toBe('');
    });

    it('devuelve cadena vacía para data nula', async () => {
      await expect(service.generateCsv(null as any)).resolves.toBe('');
    });

    it('genera CSV con BOM y cabeceras a partir de las claves de la primera fila', async () => {
      const result = await service.generateCsv([
        { Nombre: 'Juan', Empresa: 'ACME' },
        { Nombre: 'Ana', Empresa: 'Globex' },
      ]);

      expect(result.startsWith('﻿')).toBe(true);
      expect(result).toContain('Nombre,Empresa');
      expect(result).toContain('Juan,ACME');
      expect(result).toContain('Ana,Globex');
    });

    it('antepone apóstrofo a valores con riesgo de inyección de fórmulas', async () => {
      const result = await service.generateCsv([
        { a: '=1+1', b: '+2', c: '-3', d: '@evil', e: 'seguro' },
      ]);

      expect(result).toContain("'=1+1");
      expect(result).toContain("'+2");
      expect(result).toContain("'-3");
      expect(result).toContain("'@evil");
      expect(result).toContain('seguro');
    });
  });

  it('exporta una instancia singleton reportService', () => {
    expect(reportService).toBeInstanceOf(ReportService);
  });
});
