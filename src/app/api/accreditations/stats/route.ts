import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { startOfDay, endOfDay } from 'date-fns';
import Accreditation from '@/models/Accreditation';
import EventSchedule from '@/models/EventSchedule';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const totalAccreditations = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
    });

    const today = new Date();
    const accreditationsToday = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
      where: {
        checkInTime: {
          [Op.between]: [startOfDay(today), endOfDay(today)],
        },
      },
    });

    return NextResponse.json({ totalAccreditations, accreditationsToday });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
