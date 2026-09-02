/**
 * Static venue map tiles for the web app — a plain image URL, deliberately NO
 * interactive map SDK.
 *
 * The mobile app avoids `react-native-maps` because a native module would force
 * a fresh EAS build; on the web the equivalent cost is different but no smaller.
 * An embedded Google Maps JS map (or Mapbox GL) means a ~200KB third-party
 * script, a `script-src`/`connect-src`/`frame-src` widening of an *enforcing*
 * CSP, and a browser-key that the page hands to a live, quota-metered API on
 * every view. A static tile is one `<img>`: it needs a single `img-src` host,
 * costs one cached request, and cannot execute anything.
 *
 * Keyless-safe by design — the contract that matters. Every static tile
 * provider requires a key and this project has none configured anywhere. With
 * no key `buildStaticMapUrl` returns `null` and the caller renders nothing at
 * all. That is the correct outcome, not a degradation: Google answers a keyless
 * request with a grey 403 tile reading "You must enable Billing", which is a
 * worse thing to put on an event page than empty space. The address is already
 * written out in text directly above the tile, so nothing is lost.
 *
 * TO ENABLE: set `NEXT_PUBLIC_GOOGLE_STATIC_MAPS_KEY` (with the Static Maps API
 * enabled on it, and an HTTP-referrer restriction to the app's own domains,
 * since a NEXT_PUBLIC value ships inside the client bundle). Google is the key
 * that matters, because it geocodes a text address server-side and NO event in
 * this database stores coordinates. `NEXT_PUBLIC_MAPBOX_TOKEN` is also
 * supported but can only render events that DO have coordinates — see
 * `pickProvider`.
 */
import { countrySupport } from './country-support';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * What we know about where the venue is. Either half may be null; the builder
 * picks the best URL it can from whichever is populated.
 */
export interface VenueTarget {
  coords: LatLng | null;
  /** Comma-joined text address, good enough for a server-side geocode. */
  address: string | null;
}

/**
 * Provider keys. Neither is set today.
 *
 * `NEXT_PUBLIC_*` names are inlined by the Next compiler at build time, so they
 * must be read as literal member expressions — `process.env[someVar]` is NOT
 * substituted and would read `undefined` in the browser.
 *
 * The server-only names are read as a fallback so a future server component (or
 * an API route proxying the tile) can use this same builder with a key that
 * never reaches the client. In a client component they are simply `undefined`,
 * which is why the owner has to set the NEXT_PUBLIC pair for the venue tile as
 * it is wired today.
 */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
const GOOGLE_STATIC_MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_STATIC_MAPS_KEY || process.env.GOOGLE_STATIC_MAPS_KEY;

const clean = (v: string | undefined): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

/**
 * Provider choice is per-request, not a fixed preference order, because the two
 * providers are not interchangeable:
 *
 *   - Mapbox renders a nicer dark tile but its static endpoint accepts lon/lat
 *     ONLY — it cannot geocode a text address.
 *   - Google can geocode a text `center` server-side.
 *
 * No event in the database carries coordinates today, so **Google is the key to
 * set**: a Mapbox token alone would leave the map invisible on every event. A
 * fixed "Mapbox preferred" order would have been a footgun.
 */
function pickProvider(hasCoords: boolean): 'mapbox' | 'google' | null {
  const mapbox = clean(MAPBOX_TOKEN);
  const google = clean(GOOGLE_STATIC_MAPS_KEY);
  // With a real point, Mapbox's dark style is the better-looking tile.
  if (hasCoords && mapbox) return 'mapbox';
  // Google handles both coordinates and addresses.
  if (google) return 'google';
  return null;
}

const isLat = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 90;
const isLng = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 180;

/** Coerce a Firestore value that may have been stored as a numeric string. */
function num(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Pull a usable venue coordinate off an event doc, or `null`.
 *
 * IMPORTANT: events are authored with `venue_name` / `address` / `city` as TEXT
 * ONLY — no step in the create-event flow (web composer or mobile) writes a
 * coordinate and nothing geocodes the address — so for every event in the
 * database today this returns `null`, and the tile is drawn from the text
 * address instead. A map centred on the wrong place is worse than no map, so
 * this reads only shapes that unambiguously mean "the venue".
 *
 * It covers the usual nested containers and Firestore GeoPoint's
 * `_latitude` / `_longitude`, so the map upgrades itself to an exact point if
 * geocoding is ever added upstream, with no change here.
 */
export function resolveVenueLatLng(event: unknown): LatLng | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, any>;

  const containers = [e, e.coordinates, e.coords, e.geo, e.geopoint, e.location, e.venue];
  for (const c of containers) {
    if (!c || typeof c !== 'object') continue;
    const lat = num(c.latitude ?? c.lat ?? c._latitude);
    const lng = num(c.longitude ?? c.lng ?? c.lon ?? c.long ?? c._longitude);
    // Null Island is the classic "geocoder returned nothing" sentinel, not a venue.
    if (isLat(lat) && isLng(lng) && !(lat === 0 && lng === 0)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

/** Collapse whitespace and trim; '' for anything not a usable string. */
function tidy(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

/**
 * Human country name for the geocode string. The web `country-support` module
 * exposes the support record rather than a name helper (mobile has a
 * `countryName`), so read the name off the record and fall back to '' — an
 * unknown country code is a disambiguator we are better off omitting than
 * feeding to a geocoder verbatim.
 */
function countryLabel(country: unknown): string {
  return countrySupport(country)?.name ?? '';
}

/**
 * Assemble a geocodable text address from the event's text location fields.
 *
 * Ordered most-specific → least-specific, which is what geocoders expect:
 *   venue_name, address, commune, city, department, country
 *
 * Parts are deduplicated case-insensitively, and a part already contained in an
 * accepted part is dropped — so an address of "12 Rue Grégoire, Pétion-Ville"
 * followed by city "Pétion-Ville" does not repeat the commune.
 *
 * THRESHOLD: the result must contain at least one *specific locator* — a
 * `venue_name` or a street `address`. City / commune / department / country
 * alone are rejected (→ `null`), because centring on a city and presenting it
 * as the venue is exactly the "map of the wrong place" this guards against.
 * `country` defaults to 'HT' on every event, so it is only ever a
 * disambiguator, never the thing that makes an address pass.
 */
export function resolveVenueAddress(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, any>;

  const venue = tidy(e.venue_name);
  const street = tidy(e.address);
  // No specific locator ⇒ nothing worth drawing.
  if (!venue && !street) return null;

  const candidates = [
    venue,
    street,
    tidy(e.commune),
    tidy(e.city),
    tidy(e.department),
    tidy(countryLabel(e.country)),
  ];

  const accepted: string[] = [];
  for (const part of candidates) {
    if (!part) continue;
    const norm = part.toLowerCase();
    // Skip exact repeats and parts already spelled out inside an earlier part.
    if (accepted.some((a) => a.toLowerCase() === norm || a.toLowerCase().includes(norm))) continue;
    accepted.push(part);
  }

  const joined = accepted.join(', ');
  // A stray one- or two-character venue name is not a place.
  return joined.length >= 6 ? joined : null;
}

/** Both halves of what we know about the venue's position. */
export function resolveVenueTarget(event: unknown): VenueTarget {
  return {
    coords: resolveVenueLatLng(event),
    address: resolveVenueAddress(event),
  };
}

export interface StaticMapOpts extends Partial<LatLng> {
  /** Exact position, when the doc carries one. */
  coords?: LatLng | null;
  /** Text address for a server-side geocode, when it does not. */
  address?: string | null;
  /** Requested tile width in CSS px. Defaults to the provider maximum. */
  width?: number;
  /** Requested tile height in CSS px. Defaults to `TILE_WIDTH / 3 * 2`. */
  height?: number;
  /** Overrides the per-mode default zoom. */
  zoom?: number;
}

/** Street level — tight enough to recognise the block, when we know the point. */
const COORD_ZOOM = 15;
/**
 * One step wider for address-geocoded tiles. The geocode is approximate and
 * Google may resolve to a nearby locality rather than the exact venue, so the
 * tile is framed as neighbourhood context rather than a rooftop claim.
 */
const ADDRESS_ZOOM = 14;

/**
 * Default request size, and why it is fixed rather than measured.
 *
 * The mobile component measures its box and asks for exactly that many dp,
 * because a phone screen has one known width. On the web the same tile is shown
 * at two very different widths (a ~700px desktop column and a ~350px phone
 * accordion) and those widths move with the viewport — measuring would mean a
 * layout pass before the first request, a new URL on every resize, and a cache
 * miss per breakpoint.
 *
 * So we request the largest single tile both providers allow (640 CSS px, at
 * `scale=2` → 1280 device px) once, and let CSS `object-fit: cover` fit it to
 * whatever box it lands in. One URL, one cache entry, retina-sharp everywhere,
 * and never upscaled.
 */
export const TILE_WIDTH = 640;
/** 3:2 — the mobile app's ratio, kept identical so the two feel like one product. */
export const TILE_ASPECT = 3 / 2;
export const TILE_HEIGHT = Math.round(TILE_WIDTH / TILE_ASPECT);

/** Strip the leading `#` so a palette value can be used as a URL colour param. */
const hex = (token: string) => token.replace('#', '');

/**
 * The dark canvas, restated as literals.
 *
 * These are URL query parameters, not CSS, so they cannot come from a Tailwind
 * class or a CSS variable — the provider needs the resolved hex. The values are
 * the same steps the mobile theme tokens use (and `accent` is exactly
 * tailwind `brand-500`), so the two apps' tiles are pixel-identical.
 */
const CANVAS = {
  bg: '#0A0A0A',
  surface: '#161616',
  surfaceRaised: '#1F1F1F',
  textSecondary: '#A3A3A3',
  accent: '#14B8A6',
} as const;

/**
 * Build a static tile URL, or `null` when there is nothing to draw or no
 * provider key. Both providers are requested at @2x so the tile stays crisp on
 * retina displays; both cap a single tile at 640×640 CSS px, so clamp to that.
 */
export function buildStaticMapUrl(opts: StaticMapOpts): string | null {
  // Accept either the {coords} shape or bare latitude/longitude.
  const lat = opts.coords?.latitude ?? opts.latitude;
  const lng = opts.coords?.longitude ?? opts.longitude;
  const hasCoords = isLat(lat) && isLng(lng);

  const address = tidy(opts.address);
  if (!hasCoords && !address) return null;

  const w = Math.max(1, Math.min(640, Math.round(opts.width ?? TILE_WIDTH)));
  const h = Math.max(1, Math.min(640, Math.round(opts.height ?? TILE_HEIGHT)));
  const zoom = opts.zoom ?? (hasCoords ? COORD_ZOOM : ADDRESS_ZOOM);

  const provider = pickProvider(hasCoords);

  // NOTE: `pickProvider` never returns 'mapbox' without coordinates. Mapbox's
  // static endpoint takes lon/lat ONLY — it has no server-side geocoding, so an
  // address-only event genuinely cannot be rendered by Mapbox. That is a
  // provider limitation, not an oversight; with only a Mapbox token configured
  // such an event falls through to `null` and no tile is drawn.
  if (provider === 'mapbox') {
    // Mapbox's own dark style already matches the black canvas, so no per-call
    // styling is needed. Marker is teal because teal here CARRIES MEANING.
    const marker = `pin-s+${hex(CANVAS.accent)}(${lng},${lat})`;
    const center = `${lng},${lat},${zoom},0`;
    return (
      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${marker}/${center}/${w}x${h}@2x` +
      `?access_token=${encodeURIComponent(clean(MAPBOX_TOKEN) as string)}&attribution=false&logo=false`
    );
  }

  if (provider === 'google') {
    // Google ships a light map by default; these `style=` rules repaint it in
    // the app's own canvas steps so it doesn't glow white on a black page.
    const style = [
      `element:geometry|color:0x${hex(CANVAS.surface)}`,
      `element:labels.text.fill|color:0x${hex(CANVAS.textSecondary)}`,
      `element:labels.text.stroke|color:0x${hex(CANVAS.bg)}`,
      `element:labels.icon|visibility:off`,
      `feature:poi|element:labels|visibility:off`,
      `feature:road|element:geometry|color:0x${hex(CANVAS.surfaceRaised)}`,
      `feature:water|element:geometry|color:0x${hex(CANVAS.bg)}`,
      `feature:administrative|element:geometry|visibility:off`,
    ]
      .map((s) => `&style=${encodeURIComponent(s)}`)
      .join('');

    // Google's Static Maps API geocodes a text `center` (and a text `markers`
    // location) SERVER-SIDE, so an address-only event still renders a map with
    // no stored coordinates and no geocoding step at event-create time.
    const target = hasCoords ? `${lat},${lng}` : address;

    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${encodeURIComponent(target)}&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=roadmap` +
      `&markers=${encodeURIComponent(`color:0x${hex(CANVAS.accent)}|${target}`)}` +
      style +
      `&key=${encodeURIComponent(clean(GOOGLE_STATIC_MAPS_KEY) as string)}`
    );
  }

  // No key configured — the caller renders nothing.
  return null;
}
