"use client";

import React from 'react';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadEventGeneralReport } from '@/utils/generateReport';

interface ButtonEventReportProps {
    eventId: string;
    eventName: string;
    size?: 'small' | 'medium' | 'large';
}

export const ButtonEventReport: React.FC<ButtonEventReportProps> = ({ eventId, eventName, size = 'small' }) => {
    const handleClick = async () => {
        try {
            await downloadEventGeneralReport(eventId, eventName);
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error('Failed to download report');
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`p-${size === 'small' ? '1.5' : size === 'medium' ? '2' : '3'} text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors`}
            title="Download General Report"
            style={size === 'large' ? {'marginTop': 'calc(var(--spacing) * -3)', 'marginRight': 'calc(var(--spacing) * -3)'} : {}}
        >
            <FileText size={16} />
        </button>
    );
};
