import { clDayRange, clParts } from '../serverDate';
const key=(date:Date)=>{const p=clParts(date);return `${p.yyyy}-${p.MM}-${p.dd}`;};
describe('Día de Chile sin asumir 24 horas',()=>{
  test.each([
    ['2026-11-15T12:00:00.500Z','2026-11-15T03:00:00.000Z','2026-11-16T03:00:00.000Z',24],
    ['2026-09-06T12:00:00Z','2026-09-06T04:00:00.000Z','2026-09-07T03:00:00.000Z',23],
    ['2026-04-04T12:00:00Z','2026-04-04T03:00:00.000Z','2026-04-05T04:00:00.000Z',25],
    ['2028-02-29T12:00:00Z','2028-02-29T03:00:00.000Z','2028-03-01T03:00:00.000Z',24],
    ['2026-12-31T12:00:00Z','2026-12-31T03:00:00.000Z','2027-01-01T03:00:00.000Z',24],
  ])('delimita %s exactamente', (input,start,end,hours)=>{
    const ref=new Date(input), range=clDayRange(ref);
    expect(range.start.toISOString()).toBe(start);expect(range.end.toISOString()).toBe(end);
    expect((range.end.getTime()-range.start.getTime())/3600000).toBe(hours);
    expect(key(new Date(range.start.getTime()-1))).not.toBe(key(ref));
    expect(key(range.start)).toBe(key(ref));
    expect(key(new Date(range.end.getTime()-1))).toBe(key(ref));
    expect(key(range.end)).not.toBe(key(ref));
  });
  test('todas las horas del día repetido pertenecen al mismo corte',()=>{
    const range=clDayRange(new Date('2026-04-04T12:00:00Z'));
    for(let time=range.start.getTime();time<range.end.getTime();time+=15*60000) {
      const current=clDayRange(new Date(time+456));
      expect(current.start).toEqual(range.start);expect(current.end).toEqual(range.end);
    }
  });
});
