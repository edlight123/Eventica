import { useI18n } from '../contexts/I18nContext';
import { useFilters } from '../contexts/FiltersContext';
import { COUNTRY_NAMES } from '../utils/deviceLocation';

/**
 * Naming the ONE active location, in the user's language.
 *
 * Every browsing surface refuses to widen on its own, so every one of them has
 * to be able to say where "here" is — in an empty state, in a search scope
 * line, in the "elsewhere in …" rail. This is that one place.
 *
 * The awkward part is prepositions: English and Kreyòl put them in the sentence
 * ("in Haiti", "nan Ayiti"), French puts them on the name itself ("en Haïti",
 * "au Québec"). So a locale may provide `countriesIn` / `regionsIn` variants,
 * and the copy that reads "in <country>" uses those. Locales without them fall
 * straight back to the plain name.
 */

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** t() returns the key itself when the string is missing — treat that as null. */
export function translateOrNull(t: Translate, key: string): string | null {
  const value = t(key);
  return value === key ? null : value;
}

/** "Haiti" / "Ayiti" / "Haïti". */
export function countryName(t: Translate, country: string): string {
  return translateOrNull(t, `countries.${country}`) || COUNTRY_NAMES[country] || country;
}

/** The form that follows "in": "Haiti", "en Haïti", "Ayiti". */
export function countryIn(t: Translate, country: string): string {
  return translateOrNull(t, `countriesIn.${country}`) || countryName(t, country);
}

export interface ActiveLocationCopy {
  /** True when browsing the whole country — no town chosen. */
  isCountryScope: boolean;
  /** The metro / town / country name, for labels and chips. */
  locationName: string;
  /** The country's plain name. */
  country: string;
  /** The country's name in the form that follows "in". */
  countryPhrase: string;
  /** Empty-state copy that names where there is nothing. */
  emptyTitle: string;
  emptySubtitle: string;
}

export function useActiveLocationCopy(): ActiveLocationCopy {
  const { t } = useI18n();
  const { userCountry, activeCity, activeLocationLabel } = useFilters();

  const country = countryName(t, userCountry);
  const countryPhrase = countryIn(t, userCountry);
  const isCountryScope = !activeCity;
  const locationName = activeLocationLabel || activeCity || country;

  return {
    isCountryScope,
    locationName,
    country,
    countryPhrase,
    emptyTitle: isCountryScope
      ? t('discover.emptyCountry.title', { country: countryPhrase })
      : t('discover.emptyLocation.title', { location: locationName }),
    emptySubtitle: isCountryScope
      ? t('discover.emptyCountry.subtitle', { country: countryPhrase })
      : t('discover.emptyLocation.subtitle', { location: locationName }),
  };
}
