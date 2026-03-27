# Profile Country Selection & Location-Based Discovery

## Overview
Implemented a complete profile-based country selection system that allows users to set their default country in their profile settings. This preference is then used to personalize the Discover and Home pages, prioritizing events from the user's selected country.

## Features Implemented

### 1. User Profile Country Selection
**Files Modified:**
- `lib/firestore/user-profile.ts` - Client-side profile SDK
- `lib/firestore/user-profile-admin.ts` - Admin/server-side profile SDK
- `components/profile/PreferencesCard.tsx` - Profile preferences UI
- `app/profile/page.tsx` - Profile page

**Changes:**
- Added `defaultCountry?: string` field to UserProfile interface (both client and admin)
- Updated profile getter functions to parse `default_country` from Firestore with default value 'HT'
- Updated profile creation functions to include `default_country` field
- Updated profile update functions to support modifying the country preference
- New profiles default to Haiti ('HT')

**UI Features:**
- Added country selector dropdown in PreferencesCard with all 5 supported countries
- Implemented cascading selection: Country → City → Subarea
- Dynamic city dropdown that updates based on selected country
- Automatic reset of dependent fields (city, subarea) when country changes
- Location pill displays: "Country • City • Subarea"
- Real-time profile updates when country is changed

### 2. Discover Page Personalization
**Files Modified:**
- `app/discover/page.tsx` - Discover page server component
- `components/discover/DiscoverPageContent.tsx` - Discover page client component
- `lib/discover/helpers.ts` - Discover helper functions

**Changes:**
- Fetch user profile on page load to get `defaultCountry`
- Added `filterEventsByCountry()` helper function to filter events by country code
- Filter events to create country-specific section
- Pass user's country and country events to client component
- Added "Events in [Country]" section between "Happening Soon" and "Near You"
- Section shows events from user's selected country with appropriate emoji (🌎)
- "See All" link filters discover page by country

### 3. Home Page Personalization
**Files Modified:**
- `app/page.tsx` - Home page server component
- `components/HomePageContent.tsx` - Home page client component

**Changes:**
- Fetch user profile to get user's `defaultCountry`
- Prioritize events from user's country in all sections
- Split events into `eventsInUserCountry` and `eventsInOtherCountries`
- Reorder to show user's country events first: `[...userCountry, ...otherCountries]`
- Featured events prioritize user's country
- Trending events show user's country first
- Upcoming This Week shows user's country first
- Added dedicated "Events in [Country]" section
- Section displays up to 6 events from user's country
- Country name dynamically shown using LOCATION_CONFIG

## Database Schema

### Users Collection (Firestore)
```typescript
{
  // Existing fields...
  default_country: string  // Country code (HT, US, CA, FR, DO)
}
```

### Events Collection (Firestore)
```typescript
{
  // Existing fields...
  country: string  // Country code where event is located
}
```

## Supported Countries

| Code | Country Name           | Cities |
|------|------------------------|--------|
| HT   | Haiti                  | 9      |
| US   | United States          | 8      |
| CA   | Canada                 | 5      |
| FR   | France                 | 6      |
| DO   | Dominican Republic     | 5      |

## User Flow

1. **Set Country Preference**
   - User navigates to Profile page
   - Clicks on Preferences tab
   - Selects country from dropdown
   - City list updates dynamically based on country
   - Selects city and subarea (optional)
   - Preference saved to Firestore automatically

2. **Personalized Discovery**
   - User navigates to Discover page
   - System fetches user profile and reads defaultCountry
   - Events filtered by user's country shown in dedicated section
   - "Events in [Country Name]" section appears after "Happening Soon"
   - User sees events relevant to their location preference

3. **Personalized Home Page**
   - User navigates to Home page
   - System fetches user profile and reads defaultCountry
   - Featured events prioritize user's country
   - Trending events show user's country first
   - New "Events in [Country]" section shows country-specific events
   - All event lists prioritize user's country

## Technical Details

### Profile Data Access
- **Server-side**: Uses `getUserProfileAdmin(userId)` for admin SDK access
- **Client-side**: Uses `getUserProfile(userId)` for client SDK access
- **Default**: All functions default to 'HT' (Haiti) if no country set
- **Error Handling**: Try-catch blocks prevent page crashes if profile fetch fails

### Event Filtering
```typescript
// Filter events by country
export function filterEventsByCountry(events: Event[], country: string): Event[] {
  return events.filter(e => e.country === country)
}

// Prioritize user's country events
const eventsInUserCountry = events.filter(e => e.country === userCountry)
const eventsInOtherCountries = events.filter(e => e.country !== userCountry)
const prioritizedEvents = [...eventsInUserCountry, ...eventsInOtherCountries]
```

### Location Display
```typescript
// Get country name for display
const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'

// Display in UI
<h2>🌎 Events in {countryName}</h2>
```

## Benefits

1. **Personalized Discovery**: Users see events most relevant to their location
2. **Better User Experience**: No need to filter by country every time
3. **Increased Engagement**: Users more likely to attend events near them
4. **Multi-Country Support**: Seamlessly supports Eventica's expansion
5. **Cascading Selection**: Intuitive UI that prevents invalid selections
6. **Default Values**: Sensible defaults (Haiti) for existing users

## Future Enhancements

Potential improvements for the future:

1. **Timezone Support**: Adjust event times based on country timezone
2. **Distance-Based Sorting**: Sort events by proximity within country
3. **Multi-Country Selection**: Allow users to follow multiple countries
4. **Smart Recommendations**: ML-based event suggestions by location
5. **Location History**: Track user's location changes over time
6. **Geolocation API**: Auto-detect user's country on first visit
7. **Country Analytics**: Track which countries have most users
8. **Event Notifications**: Notify when new events added in user's country

## Commits

1. **3af243e** - Profile country selection with database integration
   - Added defaultCountry to UserProfile interfaces
   - Updated profile CRUD operations
   - Added country selector UI with cascading dropdowns
   - Discover page personalization

2. **180bb24** - Home page country prioritization
   - Fetch user profile for country preference
   - Prioritize events from user's country
   - Add "Events in [Country]" section
   - Sort all sections by country

## Testing Checklist

- [x] User can select country in profile
- [x] City list updates when country changes
- [x] Subarea list updates when city changes
- [x] Profile updates save to database
- [x] Discover page shows "Events in [Country]" section
- [x] Home page prioritizes user's country events
- [x] Home page shows "Events in [Country]" section
- [x] Default country is Haiti for new users
- [x] Error handling when profile fetch fails
- [x] All 5 countries display correctly

## Notes

- Profile changes are instant and don't require page refresh
- All existing users will default to Haiti ('HT') 
- System gracefully handles missing profile data
- Mobile and desktop layouts both supported
- Internationalization ready (uses translation keys)
