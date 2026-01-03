import React from 'react';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';
import { Calendar, MapPin } from 'lucide-react';

interface TemplateProps {
  event: any;
  slug: string;
}

export default function MinimalTemplate({ event, slug }: TemplateProps) {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-3xl font-light text-gray-900 mb-4">{event.name}</h1>
            <div className="flex justify-center gap-6 text-gray-500 text-sm">
                 {event.schedules && event.schedules.length > 0 && (
                    <span>
                      {new Date(event.schedules[0].startDateTime).toLocaleDateString()}
                    </span>
                  )}
                  {event.location && (
                    <span>{event.location}</span>
                  )}
            </div>
        </div>

        <div className="bg-gray-50 p-8 rounded-lg border border-gray-100">
             <PublicRegistrationForm event={event} slug={slug} />
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} Event Registration</p>
        </div>
      </div>
    </div>
  );
}
