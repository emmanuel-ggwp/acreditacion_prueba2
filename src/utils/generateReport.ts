import apiClient from '@/utils/apiClient';

export async function downloadEventGeneralReport(eventId: string, eventName: string) {
  const response = await apiClient.get(`/api/reports/events/${eventId}?type=general`, {
    responseType: 'blob',
  });

  const blob = new Blob([response as any], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event_report_${eventName.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
