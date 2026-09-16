"use client";

import React from 'react';
import { FileText, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadEventGeneralReport, downloadEventGuestsReport } from '@/utils/generateReport';

interface ButtonEventReportProps {
    eventId: string;
    eventName: string;
    size?: 'small' | 'medium' | 'large';
}

export const ButtonEventReport: React.FC<ButtonEventReportProps> = ({ eventId, eventName, size = 'small' }) => {
    const pad = size === 'small' ? '1.5' : size === 'medium' ? '2' : '3';

    const handleGeneral = async () => {
        try {
            await downloadEventGeneralReport(eventId, eventName);
            toast.success('Reporte descargado correctamente');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error('No se pudo descargar el reporte');
        }
    };

    const handleGuests = async () => {
        try {
            await downloadEventGuestsReport(eventId, eventName);
            toast.success('Reporte de invitados descargado');
        } catch (error) {
            console.error('Error downloading guests report:', error);
            toast.error('No se pudo descargar el reporte de invitados');
        }
    };

    return (
        <span
            className="inline-flex items-center"
            style={size === 'large' ? {'marginTop': 'calc(var(--spacing) * -3)', 'marginRight': 'calc(var(--spacing) * -3)'} : {}}
        >
            <button
                onClick={handleGeneral}
                className={`p-${pad} text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors`}
                title="Descargar Reporte General (participantes)"
            >
                <FileText size={16} />
            </button>
            <button
                onClick={handleGuests}
                className={`p-${pad} text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors`}
                title="Descargar Reporte de Invitados (con RUT y edad)"
            >
                <Users size={16} />
            </button>
        </span>
    );
};
