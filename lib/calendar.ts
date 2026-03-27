import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  description: string | null
  start_datetime: string
  end_datetime: string | null
  venue_name: string
  address: string | null
  city: string
}

export function generateICSFile(event: Event): string {
  const startDate = new Date(event.start_datetime)
  const endDate = event.end_datetime 
    ? new Date(event.end_datetime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

  // Format dates as YYYYMMDDTHHMMSSZ
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const location = [event.venue_name, event.address, event.city]
    .filter(Boolean)
    .join(', ')

  const description = event.description || ''
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}`

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventica//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@joineventica.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}\\n\\nView event: ${eventUrl}`,
    `LOCATION:${location}`,
    `URL:${eventUrl}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return icsContent
}

export function generateGoogleCalendarUrl(event: Event): string {
  const startDate = new Date(event.start_datetime)
  const endDate = event.end_datetime 
    ? new Date(event.end_datetime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const location = [event.venue_name, event.address, event.city]
    .filter(Boolean)
    .join(', ')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || '',
    location: location,
    sprop: `website:${process.env.NEXT_PUBLIC_APP_URL}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function generateOutlookCalendarUrl(event: Event): string {
  const startDate = new Date(event.start_datetime)
  const endDate = event.end_datetime 
    ? new Date(event.end_datetime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

  const formatOutlookDate = (date: Date) => {
    return date.toISOString()
  }

  const location = [event.venue_name, event.address, event.city]
    .filter(Boolean)
    .join(', ')

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    body: event.description || '',
    location: location,
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function generateAppleCalendarData(event: Event): string {
  // Apple Calendar uses the same ICS format
  return generateICSFile(event)
}
