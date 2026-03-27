/**
 * Brand configuration for multi-tenant support
 * In the future, this can be dynamically loaded based on subdomain or environment
 */

export interface BrandConfig {
  name: string
  primaryColor: string
  secondaryColor: string
  logoText: string
  tagline?: string
}

// Current brand: Eventica
export const BRAND: BrandConfig = {
  name: 'Eventica',
  primaryColor: '#0F766E',
  secondaryColor: '#F97316',
  logoText: 'Eventica',
  tagline: 'Discover Events in Haiti',
}

// Future brands can be added here:
export const BRANDS = {
  eventica: BRAND,
  haitipass: {
    name: 'HaitiPass',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    logoText: 'HaitiPass',
    tagline: 'Your Pass to Haiti',
  } as BrandConfig,
  haitievents: {
    name: 'HaitiEvents',
    primaryColor: '#DC2626',
    secondaryColor: '#FBBF24',
    logoText: 'HaitiEvents',
    tagline: 'Events Across Haiti',
  } as BrandConfig,
}

// Helper to get brand by key (useful for multi-tenant setup)
export function getBrand(brandKey: string = 'eventica'): BrandConfig {
  return BRANDS[brandKey as keyof typeof BRANDS] || BRAND
}
