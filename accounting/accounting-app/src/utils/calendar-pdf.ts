/**
 * Calendar PDF Generation Utility (Phase 3.5)
 * 
 * Generate printable PDF calendars with events
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarEvent {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  organizerUserId?: number;
  status?: string;
}

/**
 * Generate a month view calendar PDF
 */
export function generateMonthCalendarPDF(
  date: Date,
  events: CalendarEvent[],
  userName?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  const monthYear = format(date, 'MMMM yyyy');
  doc.setFontSize(20);
  doc.text(monthYear, 148, 15, { align: 'center' });

  if (userName) {
    doc.setFontSize(10);
    doc.text(`Calendar for ${userName}`, 148, 22, { align: 'center' });
  }

  // Calendar grid
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Day headers
  const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cellWidth = 40;
  const cellHeight = 30;
  const startX = 10;
  const startY = 30;

  // Draw headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  dayHeaders.forEach((day, i) => {
    doc.text(day, startX + (i * cellWidth) + 2, startY + 5);
  });

  // Draw calendar grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  let row = 0;
  let col = 0;

  days.forEach((day) => {
    const x = startX + (col * cellWidth);
    const y = startY + 7 + (row * cellHeight);

    // Draw cell border
    doc.rect(x, y, cellWidth, cellHeight);

    // Draw day number
    const isCurrentMonth = day.getMonth() === date.getMonth();
    if (!isCurrentMonth) {
      doc.setTextColor(150, 150, 150);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(format(day, 'd'), x + 2, y + 5);
    doc.setFont('helvetica', 'normal');

    // Draw events for this day
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.startAt), day)
    );

    let eventY = y + 10;
    dayEvents.slice(0, 3).forEach((event) => {
      const eventTime = format(new Date(event.startAt), 'HH:mm');
      const eventText = `${eventTime} ${event.title}`;
      const truncated = eventText.length > 18 ? eventText.substring(0, 15) + '...' : eventText;
      
      doc.setFontSize(7);
      doc.text(truncated, x + 2, eventY);
      eventY += 4;
    });

    if (dayEvents.length > 3) {
      doc.setFontSize(6);
      doc.text(`+${dayEvents.length - 3} more`, x + 2, eventY);
    }

    doc.setTextColor(0, 0, 0);

    col++;
    if (col === 7) {
      col = 0;
      row++;
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, 148, 200, { align: 'center' });

  return doc;
}

/**
 * Generate a week view calendar PDF
 */
export function generateWeekCalendarPDF(
  weekStart: Date,
  events: CalendarEvent[],
  userName?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const weekEnd = endOfWeek(weekStart);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Header
  doc.setFontSize(20);
  const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  doc.text(weekRange, 148, 15, { align: 'center' });

  if (userName) {
    doc.setFontSize(10);
    doc.text(`Calendar for ${userName}`, 148, 22, { align: 'center' });
  }

  // Time slots (7am to 7pm)
  const startHour = 7;
  const endHour = 19;
  const cellWidth = 40;
  const cellHeight = 8;
  const startX = 20;
  const startY = 35;

  // Day headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  weekDays.forEach((day, i) => {
    const dayLabel = format(day, 'EEE d');
    doc.text(dayLabel, startX + (i * cellWidth) + 2, startY - 5);
  });

  // Time slots and events
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (let hour = startHour; hour <= endHour; hour++) {
    const y = startY + ((hour - startHour) * cellHeight);
    
    // Time label
    doc.text(`${hour}:00`, 5, y + 5);

    // Draw cells for each day
    weekDays.forEach((day, dayIndex) => {
      const x = startX + (dayIndex * cellWidth);
      doc.rect(x, y, cellWidth, cellHeight);

      // Find events at this time
      const hourEvents = events.filter(event => {
        const eventStart = new Date(event.startAt);
        const eventHour = eventStart.getHours();
        return isSameDay(eventStart, day) && eventHour === hour;
      });

      // Draw event titles
      hourEvents.slice(0, 1).forEach((event) => {
        doc.setFontSize(7);
        const eventText = event.title.length > 15 ? event.title.substring(0, 12) + '...' : event.title;
        doc.text(eventText, x + 1, y + 5);
      });
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, 148, 200, { align: 'center' });

  return doc;
}

/**
 * Generate a list view of events PDF
 */
export function generateEventListPDF(
  startDate: Date,
  endDate: Date,
  events: CalendarEvent[],
  userName?: string
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Event List', 105, 15, { align: 'center' });

  const dateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  doc.setFontSize(12);
  doc.text(dateRange, 105, 25, { align: 'center' });

  if (userName) {
    doc.setFontSize(10);
    doc.text(`Calendar for ${userName}`, 105, 32, { align: 'center' });
  }

  // Event table
  const tableData = events.map(event => [
    format(new Date(event.startAt), 'MMM d, yyyy'),
    format(new Date(event.startAt), 'HH:mm'),
    format(new Date(event.endAt), 'HH:mm'),
    event.title,
    event.location || '-',
    event.status || 'confirmed'
  ]);

  (doc as any).autoTable({
    startY: 40,
    head: [['Date', 'Start', 'End', 'Event', 'Location', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 60 },
      4: { cellWidth: 40 },
      5: { cellWidth: 25 }
    }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.text(`Page 1 of ${pageCount} - Generated on ${format(new Date(), 'PPP')}`, 105, 285, { align: 'center' });

  return doc;
}
