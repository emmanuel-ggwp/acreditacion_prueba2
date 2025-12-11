import React from 'react';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';
import { Calendar, MapPin } from 'lucide-react';

interface TemplateProps {
  event: any;
  slug: string;
}

export default function DefaultTemplate({ event, slug }: TemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header / Banner */}
          <div className="bg-indigo-600 px-8 py-10 text-white">
            <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-indigo-100 text-sm font-medium">
              {event.EventSchedules && event.EventSchedules.length > 0 && (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  {new Date(event.EventSchedules[0].startDateTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {event.location}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {event.description && (
              <div className="prose prose-indigo mb-8 text-gray-600">
                <p>{event.description}</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Register for this Event</h2>
              <PublicRegistrationForm event={event} slug={slug} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
