import React from 'react';
import { isSameDay, isBefore, isAfter, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

interface EventStatusBadgeProps {
  startDate?: string | Date;
  endDate?: string | Date;
}

export const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({ startDate, endDate }) => {
  if (!startDate || !endDate) {
    return (
      <Badge variant="outline" className="gap-1 text-gray-500">
        <Calendar className="h-3 w-3" />
        <span>Sin fecha</span>
      </Badge>
    );
  }

  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  const now = new Date();

  // Determine status
  let status: 'ongoing' | 'finished' | 'startingToday' | 'upcoming';

  if (isAfter(now, end)) {
    status = 'finished';
  } else if (isBefore(now, start)) {
    if (isSameDay(now, start)) {
      status = 'startingToday';
    } else {
      status = 'upcoming';
    }
  } else {
    status = 'ongoing';
  }

  switch (status) {
    case 'ongoing':
      return (
        <Badge variant="success" className="gap-1.5 pr-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-medium">En Curso</span>
        </Badge>
      );
    
    case 'finished':
      return (
        <Badge variant="outline" className="gap-1 bg-slate-100 text-slate-600 border-slate-200">
          <CheckCircle className="h-3 w-3" />
          <span>Finalizado</span>
        </Badge>
      );

    case 'startingToday':
      return (
        <Badge className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent">
          <Clock className="h-3 w-3" />
          <span>Comienza Hoy</span>
        </Badge>
      );

    case 'upcoming':
      return (
        <Badge variant="default" className="gap-1">
          <Calendar className="h-3 w-3" />
          <span>Próximo</span>
        </Badge>
      );
  }
};
