import React from 'react';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface TemplateProps {
  event: any;
  slug: string;
}

export default function ModernTemplate({ event, slug }: TemplateProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col lg:flex-row">
      {/* Left Side - Info */}
      <div className="lg:w-1/3 bg-slate-800 p-12 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-6 tracking-tight">{event.name}</h1>
          
          {event.description && (
            <div className="prose prose-invert mb-8 text-slate-300">
              <p>{event.description}</p>
            </div>
          )}

          <div className="space-y-4 text-slate-300">
             {event.schedules && event.schedules.length > 0 && (
                <>
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5 text-blue-400" />
                  <span>
                  {new Date(event.schedules[0].startDateTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  </span>
                </div>
                <div className="flex items-center">
                    <Clock className="mr-3 h-5 w-5 text-blue-400" />
                    <span>
                        {new Date(event.schedules[0].startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                </>
              )}
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="mr-3 h-5 w-5 text-blue-400" />
                  <span>{event.location}</span>
                </div>
              )}
          </div>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600 rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* Right Side - Form */}
      <div className="lg:w-2/3 bg-white text-slate-900 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Secure Your Spot</h2>
                <p className="text-slate-500">Fill out the form below to register.</p>
            </div>
            <PublicRegistrationForm event={event} slug={slug} />
        </div>
      </div>
    </div>
  );
}
