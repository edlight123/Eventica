/**
 * Metro clusters — the unit of "where you are browsing".
 *
 * There is ONE active location in the app and it scopes the home feed,
 * discover, category pages and search alike. Scoping on the raw `city` string
 * is too tight (someone in Port-au-Prince would not see Pétion-Ville, which is
 * a 15-minute drive) and scoping on the country is far too loose (Miami would
 * show Cap-Haïtien). A metro is the honest middle: the set of towns people
 * genuinely treat as "here".
 *
 * HONEST LIMITATION: this list is PARTIAL and hand-written. It covers the
 * markets tikèm actually serves today (the five supported countries) and only
 * the towns we have seen on real events. A city that appears on no metro below
 * belongs to no metro at all: it stays reachable by deep link, by the
 * "elsewhere in <country>" rail and by an explicit country-wide search, but it
 * will NOT show inside another metro's feed. When a new market starts posting
 * events, add its towns here — that is the intended maintenance.
 *
 * Never widen a feed silently to compensate for a missing entry. Fix the list.
 */

export interface Metro {
  /** Stable id, used for comparisons. */
  id: string;
  /** ISO-2 country code — must match the `country` field stored on events. */
  country: string;
  /** Display name of the metro (its anchor town). */
  label: string;
  /**
   * Coarse neighbouring-market key (a state, province or department). Used only
   * to scope the "elsewhere" rail in large countries, where a country-wide rail
   * is useless — from Miami, "elsewhere in the US" means nothing, "elsewhere in
   * Florida" means something. Metro membership never depends on it.
   */
  region?: string;
  /**
   * Every city string an event in this metro may carry. The first entry is the
   * anchor. Matching is accent/case-insensitive and ignores a ", ST" suffix.
   */
  cities: string[];
}

export const METROS: Metro[] = [
  // ---------------------------------------------------------------- Haiti
  {
    id: 'ht-port-au-prince',
    country: 'HT',
    label: 'Port-au-Prince',
    region: 'Ouest',
    cities: [
      'Port-au-Prince',
      'Pétion-Ville',
      'Delmas',
      'Carrefour',
      'Tabarre',
      'Croix-des-Bouquets',
      'Kenscoff',
      'Cité Soleil',
    ],
  },
  {
    id: 'ht-cap-haitien',
    country: 'HT',
    label: 'Cap-Haïtien',
    region: 'Nord',
    cities: ['Cap-Haïtien', 'Limbé', 'Milot', 'Quartier-Morin'],
  },
  { id: 'ht-jacmel', country: 'HT', label: 'Jacmel', region: 'Sud-Est', cities: ['Jacmel', 'Marigot'] },
  { id: 'ht-les-cayes', country: 'HT', label: 'Les Cayes', region: 'Sud', cities: ['Les Cayes', 'Torbeck'] },
  { id: 'ht-gonaives', country: 'HT', label: 'Gonaïves', region: 'Artibonite', cities: ['Gonaïves'] },
  { id: 'ht-saint-marc', country: 'HT', label: 'Saint-Marc', region: 'Artibonite', cities: ['Saint-Marc'] },
  { id: 'ht-port-de-paix', country: 'HT', label: 'Port-de-Paix', region: 'Nord-Ouest', cities: ['Port-de-Paix'] },
  { id: 'ht-jeremie', country: 'HT', label: 'Jérémie', region: 'Grand’Anse', cities: ['Jérémie'] },
  { id: 'ht-fort-liberte', country: 'HT', label: 'Fort-Liberté', region: 'Nord-Est', cities: ['Fort-Liberté', 'Ouanaminthe'] },

  // ------------------------------------------------------- United States
  {
    id: 'us-miami',
    country: 'US',
    label: 'Miami',
    region: 'FL',
    cities: [
      'Miami',
      'Miami, FL',
      'Fort Lauderdale',
      'Hollywood',
      'Hialeah',
      'Miami Beach',
      'Miami Gardens',
      'North Miami',
      'Pembroke Pines',
      'Miramar',
      'Sunrise',
      'Coral Springs',
      'Boca Raton',
      'Delray Beach',
      'West Palm Beach',
    ],
  },
  {
    id: 'us-new-york',
    country: 'US',
    label: 'New York',
    // Deliberately one key for the tri-state area: Newark is the same night out
    // as Brooklyn even though it is a different state.
    region: 'NY-metro',
    cities: [
      'New York',
      'New York, NY',
      'Brooklyn',
      'Queens',
      'Bronx',
      'Staten Island',
      'Manhattan',
      'Newark',
      'Jersey City',
      'Elizabeth',
      'Yonkers',
      'Mount Vernon',
      'East Orange',
      'Irvington',
    ],
  },
  { id: 'us-boston', country: 'US', label: 'Boston', region: 'MA', cities: ['Boston', 'Boston, MA', 'Cambridge', 'Somerville', 'Brockton', 'Randolph', 'Mattapan'] },
  { id: 'us-atlanta', country: 'US', label: 'Atlanta', region: 'GA', cities: ['Atlanta', 'Atlanta, GA', 'Decatur', 'Marietta', 'Stonecrest'] },
  { id: 'us-orlando', country: 'US', label: 'Orlando', region: 'FL', cities: ['Orlando', 'Orlando, FL', 'Kissimmee', 'Winter Park'] },
  { id: 'us-tampa', country: 'US', label: 'Tampa', region: 'FL', cities: ['Tampa', 'Tampa, FL', 'St. Petersburg', 'Clearwater'] },
  { id: 'us-chicago', country: 'US', label: 'Chicago', region: 'IL', cities: ['Chicago', 'Chicago, IL', 'Evanston', 'Oak Park'] },
  { id: 'us-houston', country: 'US', label: 'Houston', region: 'TX', cities: ['Houston', 'Houston, TX', 'Sugar Land', 'Pasadena'] },
  { id: 'us-los-angeles', country: 'US', label: 'Los Angeles', region: 'CA', cities: ['Los Angeles', 'Los Angeles, CA', 'Long Beach', 'Inglewood', 'Pasadena, CA'] },

  // ------------------------------------------------------------- Canada
  {
    id: 'ca-montreal',
    country: 'CA',
    label: 'Montreal',
    region: 'QC',
    cities: ['Montreal', 'Montreal, QC', 'Montréal', 'Laval', 'Longueuil', 'Brossard', 'Saint-Léonard', 'Rivière-des-Prairies'],
  },
  { id: 'ca-toronto', country: 'CA', label: 'Toronto', region: 'ON', cities: ['Toronto', 'Toronto, ON', 'Mississauga', 'Brampton', 'Scarborough', 'North York', 'Markham'] },
  { id: 'ca-ottawa', country: 'CA', label: 'Ottawa', region: 'ON', cities: ['Ottawa', 'Ottawa, ON', 'Gatineau'] },
  { id: 'ca-vancouver', country: 'CA', label: 'Vancouver', region: 'BC', cities: ['Vancouver', 'Vancouver, BC', 'Burnaby', 'Richmond', 'Surrey'] },
  { id: 'ca-calgary', country: 'CA', label: 'Calgary', region: 'AB', cities: ['Calgary', 'Calgary, AB'] },

  // ------------------------------------------------------------- France
  {
    id: 'fr-paris',
    country: 'FR',
    label: 'Paris',
    region: 'IDF',
    cities: ['Paris', 'Saint-Denis', 'Montreuil', 'Créteil', 'Boulogne-Billancourt', 'Aubervilliers', 'Versailles', 'Nanterre', 'Ivry-sur-Seine'],
  },
  { id: 'fr-lyon', country: 'FR', label: 'Lyon', region: 'ARA', cities: ['Lyon', 'Villeurbanne'] },
  { id: 'fr-marseille', country: 'FR', label: 'Marseille', region: 'PACA', cities: ['Marseille', 'Aix-en-Provence'] },
  { id: 'fr-nice', country: 'FR', label: 'Nice', region: 'PACA', cities: ['Nice', 'Cannes', 'Antibes'] },
  { id: 'fr-toulouse', country: 'FR', label: 'Toulouse', region: 'OCC', cities: ['Toulouse'] },
  { id: 'fr-bordeaux', country: 'FR', label: 'Bordeaux', region: 'NAQ', cities: ['Bordeaux', 'Mérignac'] },

  // ------------------------------------------------- Dominican Republic
  {
    id: 'do-santo-domingo',
    country: 'DO',
    label: 'Santo Domingo',
    region: 'DN',
    cities: ['Santo Domingo', 'Santo Domingo Este', 'Santo Domingo Norte', 'Boca Chica', 'San Cristóbal'],
  },
  { id: 'do-santiago', country: 'DO', label: 'Santiago', region: 'STI', cities: ['Santiago', 'Santiago de los Caballeros'] },
  { id: 'do-punta-cana', country: 'DO', label: 'Punta Cana', region: 'LAL', cities: ['Punta Cana', 'Bávaro', 'Higüey'] },
  { id: 'do-la-romana', country: 'DO', label: 'La Romana', region: 'LRO', cities: ['La Romana', 'Bayahibe'] },
  { id: 'do-puerto-plata', country: 'DO', label: 'Puerto Plata', region: 'PPL', cities: ['Puerto Plata', 'Sosúa', 'Cabarete'] },
];

/**
 * Is a country-wide "elsewhere" rail useful here?
 *
 * - `country`: few metros and thin supply — an event two towns over is still
 *   worth surfacing (Haiti, the DR).
 * - `region`: the country is too big for that. Only same-state / same-province
 *   markets are offered ("elsewhere in Florida", not "elsewhere in the US").
 * - `none`: no rail at all.
 */
export type ElsewhereScope = 'country' | 'region' | 'none';

export const ELSEWHERE_SCOPE: Record<string, ElsewhereScope> = {
  HT: 'country',
  DO: 'country',
  US: 'region',
  CA: 'region',
  FR: 'region',
};

export function elsewhereScopeFor(country: string): ElsewhereScope {
  return ELSEWHERE_SCOPE[country] || 'none';
}

/** English fallbacks for region keys; locales override via `regions.<key>`. */
export const REGION_LABELS: Record<string, string> = {
  FL: 'Florida',
  'NY-metro': 'the New York area',
  MA: 'Massachusetts',
  GA: 'Georgia',
  IL: 'Illinois',
  TX: 'Texas',
  CA: 'California',
  QC: 'Quebec',
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  IDF: 'Île-de-France',
  ARA: 'Auvergne-Rhône-Alpes',
  PACA: 'Provence-Alpes-Côte d’Azur',
  OCC: 'Occitanie',
  NAQ: 'Nouvelle-Aquitaine',
  Ouest: 'Ouest',
  Nord: 'Nord',
  'Sud-Est': 'Sud-Est',
  Sud: 'Sud',
  Artibonite: 'Artibonite',
  'Nord-Ouest': 'Nord-Ouest',
  'Grand’Anse': 'Grand’Anse',
  'Nord-Est': 'Nord-Est',
  DN: 'Distrito Nacional',
  STI: 'Santiago',
  LAL: 'La Altagracia',
  LRO: 'La Romana',
  PPL: 'Puerto Plata',
};

/**
 * Lowercase, strip accents, drop a ", ST" / ", Ouest" suffix and flatten
 * separators, so "Pétion-Ville, Ouest", "petion ville" and "Pétion-Ville" are
 * one and the same place.
 */
export function normalizePlace(value: any): string {
  return (value ?? '')
    .toString()
    .split(',')[0]
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// city (normalized) → metro, per country. Built once at module load.
const CITY_INDEX = new Map<string, Metro>();
for (const metro of METROS) {
  for (const city of metro.cities) {
    const key = `${metro.country}:${normalizePlace(city)}`;
    if (!CITY_INDEX.has(key)) CITY_INDEX.set(key, metro);
  }
}

/** The country an event browses under. Legacy events carry no country. */
export function eventCountry(event: any): string {
  return (event?.country || 'HT').toString().toUpperCase();
}

/**
 * The metro a place belongs to, or null when we have never heard of it.
 * `country` narrows the lookup (there is a Santiago in the DR and a Santiago
 * elsewhere); without it, the first country that lists the town wins.
 */
export function findMetro(city: any, country?: string): Metro | null {
  const normalized = normalizePlace(city);
  if (!normalized) return null;

  if (country) {
    const hit = CITY_INDEX.get(`${country.toUpperCase()}:${normalized}`);
    if (hit) return hit;
    // Tolerate longer stored strings ("Delmas 33", "Brooklyn NY").
    for (const metro of METROS) {
      if (metro.country !== country.toUpperCase()) continue;
      if (metro.cities.some((c) => placesOverlap(normalized, normalizePlace(c)))) return metro;
    }
    return null;
  }

  for (const metro of METROS) {
    if (metro.cities.some((c) => placesOverlap(normalized, normalizePlace(c)))) return metro;
  }
  return null;
}

/** "delmas 33" contains "delmas"; "brooklyn" is contained by "brooklyn ny". */
function placesOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

/** The metro an event sits in, or null (no city, or a town we don't know). */
export function metroForEvent(event: any): Metro | null {
  return findMetro(event?.city, eventCountry(event));
}

/** Is this event inside the given metro? Country must agree too. */
export function isEventInMetro(event: any, metro: Metro | null): boolean {
  if (!metro) return false;
  if (eventCountry(event) !== metro.country) return false;
  const eventMetro = metroForEvent(event);
  return !!eventMetro && eventMetro.id === metro.id;
}

/**
 * Events worth showing under "elsewhere in <place>": same country (or same
 * region in a big country), but NOT in the active metro. Never mixed into
 * local results — the caller renders these under their own labelled header.
 */
export function elsewhereEvents(events: any[], metro: Metro | null): any[] {
  if (!metro) return [];
  const scope = elsewhereScopeFor(metro.country);
  if (scope === 'none') return [];
  return events.filter((event) => {
    if (eventCountry(event) !== metro.country) return false;
    if (isEventInMetro(event, metro)) return false;
    if (scope === 'region') {
      const other = metroForEvent(event);
      // A town in no metro has no region, so it cannot be proven nearby.
      if (!other || !metro.region || other.region !== metro.region) return false;
    }
    return true;
  });
}

/** Display name for the active location: the metro's, or the raw city. */
export function locationLabel(city: string, country?: string): string {
  const metro = findMetro(city, country);
  return metro?.label || (city || '').split(',')[0].trim();
}
