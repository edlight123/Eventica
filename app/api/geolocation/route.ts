import { NextRequest, NextResponse } from 'next/server'
import { 
  getLocationFromVercelHeaders, 
  detectLocationFromIP, 
  mapToSupportedLocation, 
  getLocationDisplayName 
} from '@/lib/geolocation'

export async function GET(request: NextRequest) {
  try {
    // 1. Try Vercel's built-in geolocation headers first (FREE, no setup)
    let geo = getLocationFromVercelHeaders(request.headers)
    
    // 2. Fallback to ip-api.com for local development
    if (!geo) {
      const forwardedFor = request.headers.get('x-forwarded-for')
      const realIP = request.headers.get('x-real-ip')
      const ip = forwardedFor?.split(',')[0]?.trim() || realIP || undefined
      geo = await detectLocationFromIP(ip)
    }
    
    if (!geo) {
      return NextResponse.json({ 
        detected: false,
        error: 'Could not detect location'
      })
    }
    
    // Map to our supported locations
    const mapped = mapToSupportedLocation(geo)
    const displayName = getLocationDisplayName(geo, mapped)
    
    return NextResponse.json({
      detected: true,
      raw: {
        country: geo.country,
        countryCode: geo.countryCode,
        city: geo.city,
        region: geo.region
      },
      mapped: {
        countryCode: mapped.countryCode,
        countryName: mapped.countryName,
        city: mapped.city,
        isSupported: mapped.isSupported
      },
      displayName
    })
  } catch (error) {
    // Don't log Next.js's dynamic-rendering signal (fired during build) as an error.
    const digest = (error as { digest?: string })?.digest || ''
    if (digest !== 'DYNAMIC_SERVER_USAGE') {
      console.error('Geolocation API error:', error)
    }
    return NextResponse.json({ 
      detected: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
