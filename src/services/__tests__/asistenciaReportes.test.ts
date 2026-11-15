import * as XLSX from 'xlsx';
import { ReportService } from '../reportService';
import { Event, EventSchedule, Participant, ParticipantSchedule, Accreditation, ParticipantAward } from '@/models/index';
import { sequelize } from '@/lib/sequelize';
import { attendanceExportRow, attendanceSummary } from '@/utils/attendanceReport';

describe('Reportes: reconciliación de personas y cantidades', () => {
  const service = new ReportService();
  const hour = new Date('2026-11-14T15:15:00Z');
  beforeEach(() => {
    jest.resetAllMocks();
    (Event.findByPk as jest.Mock).mockResolvedValue({ id:'e',name:'Evento',maxCapacity:0 });
    (EventSchedule.findAll as jest.Mock).mockResolvedValue([{id:'s',scheduleName:'Fecha',startDateTime:hour,endDateTime:hour,maxCapacity:0}]);
    (Participant.count as jest.Mock).mockResolvedValue(1);
    (ParticipantSchedule.findAll as jest.Mock).mockResolvedValue([{scheduleId:'s',count:1}]);
    (ParticipantAward.count as jest.Mock).mockResolvedValue(0);
    (sequelize.query as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([{scheduleId:'s',count:4}]).mockResolvedValueOnce([]);
  });
  test('reporte, timeline y dashboard incluyen al titular y sus cuatro cargas', async () => {
    (Accreditation.findAll as jest.Mock)
      .mockResolvedValueOnce([{eventScheduleId:'s',total:1,participants:1,guests:0,numericGuests:4}])
      .mockResolvedValueOnce([{checkInTime:hour,guestCount:4}])
      .mockResolvedValueOnce([{records:1,numericGuests:4}]);
    const report = await service.getEventReport('e');
    const dashboard = await service.getDashboardStats('e');
    expect(report.participantStats.totalAccredited).toBe(5);
    expect(report.accreditationTimeline.reduce((n,r)=>n+r.count,0)).toBe(5);
    expect((dashboard as any).totalAccredited).toBe(5);
  });
  test('personas de hoy y monitor reciente incluyen las cantidades', async () => {
    (Event.count as jest.Mock).mockResolvedValue(1);
    (Accreditation.findAll as jest.Mock).mockResolvedValue([{records:1,numericGuests:4}]);
    (EventSchedule.findAll as jest.Mock).mockResolvedValue([]);
    expect((await service.getDashboardStats() as any).accreditationsToday).toBe(5);
    expect((await service.getRealTimeStats('e')).accreditationsLast30Min).toBe(5);
  });
});

describe('Excel por fecha y desglose de invitados', () => {
  test('mezcla cargas, acompañantes, otros y cantidades sin inventar identidad o tipo', () => {
    const row = attendanceExportRow({participantId:'p',scheduleId:'s',registered:true,accredited:true,namedRegistered:3,namedAccredited:2,loadsRegistered:1,loadsAccredited:1,companionsRegistered:1,companionsAccredited:1,othersRegistered:1,numericRegistered:4,numericAccredited:2});
    expect(row['Invitados inscritos']).toBe(7);
    expect(row['Invitados acreditados']).toBe(4);
    expect(row['Total personas acreditadas']).toBe(5);
    expect(row['Invitados numéricos acreditados']).toBe(2);
    expect(row['Cargas con nombre acreditadas']).toBe(1);
  });
  test('una persona en dos fechas suma dos asistencias, sin duplicar dentro de cada fecha', () => {
    const records = ['s1','s2'].map(scheduleId=>({participantId:'p',scheduleId,registered:true,accredited:true,numericAccredited:3}));
    const summary = attendanceSummary(records);
    expect(summary).toHaveLength(3);
    expect(summary.at(-1)['Titulares acreditados']).toBe(2);
    expect(summary.at(-1)['Total personas acreditadas']).toBe(8);
  });
  test('solo acreditados filtra grupos ausentes, conserva invitado sin titular y concilia hojas', async () => {
    const service = new ReportService();
    jest.spyOn(service,'getAttendanceRecords').mockResolvedValue([
      {participantId:'p1',scheduleId:'s1',registered:true,accredited:true,numericRegistered:4,numericAccredited:3},
      {participantId:'p2',scheduleId:'s1',registered:true,accredited:false,namedRegistered:1,namedAccredited:1,loadsAccredited:1},
      {participantId:'p3',scheduleId:'s1',registered:true,accredited:false},
    ]);
    const wb = XLSX.read(Buffer.from(await service.generateAttendanceXlsx('e',true)),{type:'buffer'});
    const detail: any[] = XLSX.utils.sheet_to_json(wb.Sheets.Acreditados);
    const summary: any[] = XLSX.utils.sheet_to_json(wb.Sheets.Resumen);
    expect(detail).toHaveLength(2);
    expect(detail.reduce((n,r)=>n+r['Total personas acreditadas'],0)).toBe(5);
    expect(summary.at(-1)['Total personas acreditadas']).toBe(5);
    expect(summary.at(-1)['Titulares inscritos']).toBe(3);
    expect(wb.Sheets.Acreditados['!autofilter']).toBeDefined();
  });
  test('sin datos mantiene un resumen de cero, sin personas ficticias', async () => {
    const service = new ReportService();
    jest.spyOn(service,'getAttendanceRecords').mockResolvedValue([]);
    const wb = XLSX.read(Buffer.from(await service.generateAttendanceXlsx('e',true)),{type:'buffer'});
    expect((XLSX.utils.sheet_to_json(wb.Sheets.Resumen) as any[])[0]['Total personas acreditadas']).toBe(0);
    expect((XLSX.utils.sheet_to_json(wb.Sheets.Acreditados) as any[])[0]['Sin datos']).toBeDefined();
  });
});
