/**
 * Configuration for multi-country location filters
 */

export type LocationType = 'commune' | 'neighborhood' | 'state' | 'province' | 'region' | 'department'

export interface CityConfig {
  name: string
  type: LocationType
  subdivisions: string[]
}

export interface CountryConfig {
  code: string
  name: string
  cities: Record<string, CityConfig>
}

/**
 * Multi-country location configuration
 */
export const LOCATION_CONFIG: Record<string, CountryConfig> = {
  'HT': {
    code: 'HT',
    name: 'Haiti',
    cities: {
      'Port-au-Prince': {
        name: 'Port-au-Prince',
        type: 'commune',
        subdivisions: [
          'Pétion-Ville',
          'Delmas',
          'Tabarre',
          'Carrefour',
          'Cité Soleil',
          'Croix-des-Bouquets',
          'Kenscoff',
          'Gressier'
        ]
      },
      'Cap-Haïtien': {
        name: 'Cap-Haïtien',
        type: 'neighborhood',
        subdivisions: [
          'Centre-Ville',
          'Petite Anse',
          'Vertières',
          'Quartier Morin'
        ]
      },
      'Jacmel': {
        name: 'Jacmel',
        type: 'neighborhood',
        subdivisions: [
          'Centre-Ville',
          'La Gosseline',
          'Cayes-Jacmel',
          'Cyvadier'
        ]
      },
      'Gonaïves': {
        name: 'Gonaïves',
        type: 'neighborhood',
        subdivisions: [
          'Centre',
          'Raboteau',
          'Bigot',
          'Jubilée'
        ]
      },
      'Les Cayes': {
        name: 'Les Cayes',
        type: 'neighborhood',
        subdivisions: [
          'Centre-Ville',
          'Gelée',
          'Port-Salut'
        ]
      },
      'Saint-Marc': {
        name: 'Saint-Marc',
        type: 'neighborhood',
        subdivisions: []
      },
      'Port-de-Paix': {
        name: 'Port-de-Paix',
        type: 'neighborhood',
        subdivisions: []
      },
      'Jérémie': {
        name: 'Jérémie',
        type: 'neighborhood',
        subdivisions: []
      },
      'Fort-Liberté': {
        name: 'Fort-Liberté',
        type: 'neighborhood',
        subdivisions: []
      }
    }
  },
  'US': {
    code: 'US',
    name: 'United States',
    cities: {
      'New York, NY': {
        name: 'New York',
        type: 'state',
        subdivisions: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
      },
      'Los Angeles, CA': {
        name: 'Los Angeles',
        type: 'state',
        subdivisions: ['Downtown', 'Hollywood', 'Santa Monica', 'Beverly Hills', 'Venice']
      },
      'Miami, FL': {
        name: 'Miami',
        type: 'state',
        subdivisions: ['Downtown', 'South Beach', 'Brickell', 'Wynwood', 'Little Havana']
      },
      'Houston, TX': {
        name: 'Houston',
        type: 'state',
        subdivisions: ['Downtown', 'Midtown', 'Montrose', 'The Heights']
      },
      'Chicago, IL': {
        name: 'Chicago',
        type: 'state',
        subdivisions: ['Downtown', 'North Side', 'South Side', 'West Side']
      },
      'Atlanta, GA': {
        name: 'Atlanta',
        type: 'state',
        subdivisions: ['Downtown', 'Midtown', 'Buckhead', 'East Atlanta']
      },
      'Boston, MA': {
        name: 'Boston',
        type: 'state',
        subdivisions: ['Downtown', 'Back Bay', 'South End', 'Cambridge']
      },
      'Orlando, FL': {
        name: 'Orlando',
        type: 'state',
        subdivisions: ['Downtown', 'International Drive', 'Lake Nona', 'Winter Park']
      }
    }
  },
  'CA': {
    code: 'CA',
    name: 'Canada',
    cities: {
      'Toronto, ON': {
        name: 'Toronto',
        type: 'province',
        subdivisions: ['Downtown', 'North York', 'Scarborough', 'Etobicoke', 'Mississauga']
      },
      'Montreal, QC': {
        name: 'Montreal',
        type: 'province',
        subdivisions: ['Downtown', 'Plateau', 'Old Montreal', 'Mile End', 'Westmount']
      },
      'Vancouver, BC': {
        name: 'Vancouver',
        type: 'province',
        subdivisions: ['Downtown', 'Gastown', 'Yaletown', 'Kitsilano', 'Richmond']
      },
      'Calgary, AB': {
        name: 'Calgary',
        type: 'province',
        subdivisions: ['Downtown', 'Beltline', 'Kensington', 'Inglewood']
      },
      'Ottawa, ON': {
        name: 'Ottawa',
        type: 'province',
        subdivisions: ['Downtown', 'ByWard Market', 'Gatineau', 'Kanata']
      }
    }
  },
  'FR': {
    code: 'FR',
    name: 'France',
    cities: {
      'Paris': {
        name: 'Paris',
        type: 'region',
        subdivisions: ['1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e', '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e']
      },
      'Lyon': {
        name: 'Lyon',
        type: 'region',
        subdivisions: ['1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e']
      },
      'Marseille': {
        name: 'Marseille',
        type: 'region',
        subdivisions: ['Centre', 'Nord', 'Sud', 'Est']
      },
      'Nice': {
        name: 'Nice',
        type: 'region',
        subdivisions: ['Centre', 'Vieux Nice', 'Promenade', 'Cimiez']
      },
      'Toulouse': {
        name: 'Toulouse',
        type: 'region',
        subdivisions: ['Centre', 'Capitole', 'Saint-Cyprien', 'Carmes']
      },
      'Bordeaux': {
        name: 'Bordeaux',
        type: 'region',
        subdivisions: ['Centre', 'Chartrons', 'Bastide', 'Saint-Michel']
      }
    }
  },
  'DO': {
    code: 'DO',
    name: 'Dominican Republic',
    cities: {
      'Santo Domingo': {
        name: 'Santo Domingo',
        type: 'province',
        subdivisions: ['Zona Colonial', 'Piantini', 'Naco', 'Gazcue', 'Los Cacicazgos']
      },
      'Santiago': {
        name: 'Santiago',
        type: 'province',
        subdivisions: ['Centro', 'Gurabo', 'Los Jardines', 'Cienfuegos']
      },
      'Punta Cana': {
        name: 'Punta Cana',
        type: 'province',
        subdivisions: ['Bávaro', 'Cap Cana', 'Uvero Alto']
      },
      'La Romana': {
        name: 'La Romana',
        type: 'province',
        subdivisions: ['Centro', 'Casa de Campo']
      },
      'Puerto Plata': {
        name: 'Puerto Plata',
        type: 'province',
        subdivisions: ['Centro', 'Playa Dorada', 'Sosúa', 'Cabarete']
      }
    }
  }
}

// Export list of countries
export const COUNTRIES = Object.values(LOCATION_CONFIG).map(c => ({ code: c.code, name: c.name }))

// Backward compatibility: Export Haiti cities as default
export const CITY_CONFIG = LOCATION_CONFIG['HT'].cities

export const CITIES = Object.keys(CITY_CONFIG)

/**
 * Get cities for a specific country
 */
export function getCitiesForCountry(countryCode: string): string[] {
  return Object.keys(LOCATION_CONFIG[countryCode]?.cities || {})
}

/**
 * Get all cities across all countries
 */
export function getAllCities(): Array<{ country: string; countryName: string; city: string }> {
  const allCities: Array<{ country: string; countryName: string; city: string }> = []
  Object.entries(LOCATION_CONFIG).forEach(([code, config]) => {
    Object.keys(config.cities).forEach(city => {
      allCities.push({ country: code, countryName: config.name, city })
    })
  })
  return allCities
}

/**
 * Get subdivisions for a city in a specific country
 */
export function getSubdivisions(city: string, countryCode: string = 'HT'): string[] {
  return LOCATION_CONFIG[countryCode]?.cities[city]?.subdivisions || []
}

/**
 * The set of location names a top-level city filter should match — the city
 * itself plus its subdivisions (communes/neighborhoods). Selecting
 * "Port-au-Prince" is thus metro-inclusive: it also matches events in
 * Pétion-Ville, Delmas, etc. Returns just [city] for unknown cities.
 * (city + up to 8 subdivisions stays within Firestore's 10-item `in` cap.)
 */
export function getCityMatchGroup(city: string, countryCode: string = 'HT'): string[] {
  if (!city) return []
  return [city, ...getSubdivisions(city, countryCode)]
}

/**
 * Get location type label for a city
 */
export function getLocationTypeLabel(city: string, countryCode: string = 'HT'): string {
  const type = LOCATION_CONFIG[countryCode]?.cities[city]?.type
  if (type === 'commune') return 'Commune'
  if (type === 'neighborhood') return 'Neighborhood'
  if (type === 'state') return 'State'
  if (type === 'province') return 'Province'
  if (type === 'region') return 'Region'
  if (type === 'department') return 'Department'
  return 'Area'
}

/**
 * Check if city has subdivisions
 */
export function hasSubdivisions(city: string, countryCode: string = 'HT'): boolean {
  return (LOCATION_CONFIG[countryCode]?.cities[city]?.subdivisions.length || 0) > 0
}

/**
 * Discover filter categories. These MUST match the values events are actually
 * tagged with at create/edit time (see the organizer create/edit forms), so the
 * category filter returns results. Canonical set:
 */
export const CATEGORIES = [
  'Concert',
  'Party',
  'Festival',
  'Conference',
  'Workshop',
  'Sports',
  'Theater',
  'Food & Drink',
  'Family',
  'Other',
]

/**
 * Map any stored event category (including legacy / seed / mixed-case values)
 * to one of the canonical CATEGORIES so filtering is robust. Unknown values
 * fall back to 'Other'.
 */
const CATEGORY_SYNONYMS: Record<string, string> = {
  concert: 'Concert',
  music: 'Concert',
  party: 'Party',
  nightlife: 'Party',
  festival: 'Festival',
  cultural: 'Festival',
  culture: 'Festival',
  conference: 'Conference',
  business: 'Conference',
  networking: 'Conference',
  workshop: 'Workshop',
  education: 'Workshop',
  technology: 'Workshop',
  tech: 'Workshop',
  sports: 'Sports',
  sport: 'Sports',
  theater: 'Theater',
  theatre: 'Theater',
  art: 'Theater',
  arts: 'Theater',
  'arts & culture': 'Theater',
  'food & drink': 'Food & Drink',
  food: 'Food & Drink',
  'food & culture': 'Food & Drink',
  gastronomy: 'Food & Drink',
  gastronomi: 'Food & Drink',
  dining: 'Food & Drink',
  brunch: 'Food & Drink',
  family: 'Family',
  fanmi: 'Family',
  kids: 'Family',
  community: 'Family',
  other: 'Other',
}

export function normalizeEventCategory(raw?: string | null): string {
  const key = String(raw || '').trim().toLowerCase()
  if (!key) return 'Other'
  if (CATEGORY_SYNONYMS[key]) return CATEGORY_SYNONYMS[key]
  // Exact (case-insensitive) match against a canonical category.
  const canonical = CATEGORIES.find((c) => c.toLowerCase() === key)
  return canonical || 'Other'
}

/**
 * Currency configuration by country.
 *
 * `budgetThreshold` is the "budget friendly" line (the legacy ≤/> chips).
 * `sliderMax` / `sliderStep` size the price range slider: a round ceiling the
 * top thumb can park on to mean "and up", and a step coarse enough that the
 * whole span is walkable by keyboard (~40 stops in every currency).
 */
export const CURRENCY_BY_COUNTRY: Record<
  string,
  { code: string; symbol: string; budgetThreshold: number; sliderMax: number; sliderStep: number }
> = {
  'HT': { code: 'HTG', symbol: 'HTG', budgetThreshold: 500, sliderMax: 10000, sliderStep: 250 },
  'US': { code: 'USD', symbol: '$', budgetThreshold: 5, sliderMax: 200, sliderStep: 5 },
  'CA': { code: 'CAD', symbol: 'CA$', budgetThreshold: 5, sliderMax: 200, sliderStep: 5 },
  'FR': { code: 'EUR', symbol: '€', budgetThreshold: 5, sliderMax: 200, sliderStep: 5 },
  'DO': { code: 'DOP', symbol: 'RD$', budgetThreshold: 300, sliderMax: 6000, sliderStep: 150 }
}

/**
 * Format a bare amount the way the price filters have always shown money:
 * suffixed for the currencies written after the number (HTG, RD$), prefixed for
 * the symbol currencies. Grouped with a fixed locale so the server and client
 * render the same string (no hydration drift) and no cents are shown — ticket
 * prices in this UI are whole units.
 */
export function formatPriceForCountry(amount: number, countryCode: string = 'HT'): string {
  const currency = CURRENCY_BY_COUNTRY[countryCode] || CURRENCY_BY_COUNTRY['HT']
  const n = Number.isFinite(amount) ? amount : 0
  const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
  const suffixed = currency.symbol === 'HTG' || currency.symbol === 'RD$'
  return suffixed ? `${grouped} ${currency.symbol}` : `${currency.symbol}${grouped}`
}

export interface PriceSliderConfig {
  /** Floor of the track. Always 0 — free is expressed by its own toggle. */
  min: number
  /** Ceiling. A top thumb parked here means "and up" (no upper bound). */
  max: number
  step: number
  currencyCode: string
  symbol: string
  /** The budget-friendly line, so legacy ≤/> values can be shown on the track. */
  threshold: number
}

/**
 * Slider bounds for a country's currency. HTG events run ~0–10,000 while
 * USD/CAD/EUR run ~0–200, so the bounds and step come from the currency table
 * rather than being hardcoded. Unknown countries fall back to Haiti, matching
 * the rest of this module.
 */
export function getPriceSliderConfig(countryCode: string = 'HT'): PriceSliderConfig {
  const currency = CURRENCY_BY_COUNTRY[countryCode] || CURRENCY_BY_COUNTRY['HT']
  return {
    min: 0,
    max: currency.sliderMax,
    step: currency.sliderStep,
    currencyCode: currency.code,
    symbol: currency.symbol,
    threshold: currency.budgetThreshold,
  }
}

/**
 * Price filter configurations (default - Haiti)
 * Can be extended by adding new entries
 */
export const PRICE_FILTERS = [
  { value: 'any', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: '<=500', label: '≤ 500 HTG', min: 0, max: 500 },
  { value: '>500', label: '> 500 HTG', min: 500, max: Infinity }
] as const

/**
 * Get price filter options for a specific country
 */
export function getPriceFiltersForCountry(countryCode: string = 'HT'): typeof PRICE_FILTERS {
  const currency = CURRENCY_BY_COUNTRY[countryCode] || CURRENCY_BY_COUNTRY['HT']
  const threshold = currency.budgetThreshold

  // One money formatter for the whole module (same output as before).
  const formatLabel = (prefix: string, amount: number) =>
    `${prefix} ${formatPriceForCountry(amount, countryCode)}`

  return [
    { value: 'any', label: 'Any price' },
    { value: 'free', label: 'Free' },
    { value: '<=500', label: formatLabel('≤', threshold), min: 0, max: threshold },
    { value: '>500', label: formatLabel('>', threshold), min: threshold, max: Infinity }
  ] as unknown as typeof PRICE_FILTERS
}
