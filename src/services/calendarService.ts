import { AgendaPesantren } from '../types/pesantren';

export function generateGoogleCalendarUrl(agenda: AgendaPesantren): string {
  const formatTime = (dateStr: string) => {
    // format YYYYMMDDTHHmmssZ or YYYYMMDD
    return dateStr.replace(/[^0-9]/g, '') + 'T000000Z';
  };

  const start = formatTime(agenda.tanggalMulai);
  const end = formatTime(agenda.tanggalSelesai);
  const title = encodeURIComponent(`[SantriCity] ${agenda.judul}`);
  const details = encodeURIComponent(`${agenda.keterangan}\nKategori: ${agenda.kategori}\nInfo: https://t.me/SantriCity313`);
  const location = encodeURIComponent(agenda.lokasi);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&sf=true&output=xml`;
}

export function exportToIcsFile(agendas: AgendaPesantren[], filename = 'santricity_pesantren_agenda.ics'): void {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const now = new Date();
  const timestamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SantriCity Masyarakat//Pesantren Super Platform//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SantriCity 313 Pesantren Calendar',
    'X-WR-TIMEZONE:Asia/Jakarta',
  ];

  agendas.forEach((item) => {
    const startStr = item.tanggalMulai.replace(/[^0-9]/g, '');
    const endStr = item.tanggalSelesai.replace(/[^0-9]/g, '');

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:santricity-${item.id}@islamicity.tv`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${startStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:[SantriCity] ${item.judul}`,
      `DESCRIPTION:${item.keterangan} - Kategori: ${item.kategori} - Kanal: t.me/SantriCity313`,
      `LOCATION:${item.lokasi}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
