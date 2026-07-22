/**
 * Post-purchase action helpers (POSH §2.4 action stack): Get Directions and
 * Add to Calendar. No native calendar/Wallet dependency is added — both open a
 * universal URL via `Linking`, so they work in Expo Go and bare builds alike.
 */
import { Linking, Platform } from 'react-native';

interface DirectionsOpts {
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Open the native maps app pointed at the venue. Prefers coordinates when
 * available, otherwise a text search of "venue, address, city".
 */
export function openDirections(opts: DirectionsOpts): Promise<void> {
  const label = [opts.venue, opts.address, opts.city]
    .map((s) => (s ? String(s).trim() : ''))
    .filter(Boolean)
    .join(', ');
  const query = encodeURIComponent(label || 'venue');

  const hasCoords =
    typeof opts.lat === 'number' &&
    Number.isFinite(opts.lat) &&
    typeof opts.lng === 'number' &&
    Number.isFinite(opts.lng);

  let url: string;
  if (hasCoords) {
    url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${opts.lat},${opts.lng}(${query})`
        : `geo:${opts.lat},${opts.lng}?q=${opts.lat},${opts.lng}(${query})`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  return Linking.openURL(url).catch(() => {
    // Fall back to the always-openable web maps URL.
    return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(
      () => undefined,
    );
  });
}

interface CalendarOpts {
  title: string;
  start?: Date | null;
  end?: Date | null;
  location?: string | null;
  details?: string | null;
}

function isValidDate(d?: Date | null): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/** Format a Date as the compact UTC stamp Google Calendar expects. */
function toCalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Add the event to the user's calendar via a Google Calendar template link.
 * Returns false (without throwing) if there is no valid start date.
 */
export function addToCalendar(opts: CalendarOpts): Promise<boolean> {
  if (!isValidDate(opts.start)) return Promise.resolve(false);

  const start = opts.start;
  const end = isValidDate(opts.end)
    ? opts.end
    : new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2h duration

  const params = [
    `text=${encodeURIComponent(opts.title || 'Event')}`,
    `dates=${toCalStamp(start)}/${toCalStamp(end)}`,
    opts.location ? `location=${encodeURIComponent(String(opts.location))}` : '',
    opts.details ? `details=${encodeURIComponent(String(opts.details))}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const url = `https://www.google.com/calendar/render?action=TEMPLATE&${params}`;
  return Linking.openURL(url)
    .then(() => true)
    .catch(() => false);
}
