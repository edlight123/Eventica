# PWA Event Detail Page - Complete Feature Documentation

## Reference URL
https://joineventica.com/events/OxkfukuQX4T8E2UQ2Jrf

---

## MOBILE VIEW (PWA)

### 1. **Hero Section** ✅ Mobile Has This
- Full-width banner image
- Category badge overlay (top-left)
- Event title overlay at bottom
- Organizer info with avatar
- Verified badge if applicable
- Premium badges (VIP, Trending, Sold Out, Almost Sold Out)

### 2. **Sticky Buy Button Bar** ✅ Mobile Has This
- Fixed at top when scrolling
- "Get Tickets" or price button
- Share button icon
- Favorite (heart) button

### 3. **Key Facts Cards** ✅ Mobile Has This (MobileKeyFacts component)
- Date & Time card with Calendar icon
- Location card with MapPin icon
- Ticket availability card with Users icon
- Clean card design with icons

### 4. **Accordion Sections** ✅ Mobile Has This (MobileAccordions component)
- About Event
- Venue & Location
- Date & Time
- Organizer Info
- Each section collapsible

---

## DESKTOP VIEW (PWA)

### 1. **Premium Hero Banner** ⚠️ Mobile Missing Premium Features
- Dark overlay background with banner image
- Gradient from black to transparent
- **Premium Badges Row:**
  - Category badge
  - VIP Event badge (if price > 100)
  - Trending badge (if tickets_sold > 10)
  - Sold Out badge
  - Almost Sold Out badge (if < 10 tickets left)
- Large event title (5xl on desktop)
- Organizer section with avatar and verified badge
- **Key Info Grid (3 columns):**
  - Date & Time card (accent-500 bg)
  - Location card (brand-500 bg)
  - Tickets card (purple-500 bg)
  - Each with icon, label, value, and subvalue

### 2. **Two-Column Layout** ✅ Mobile Has Single Column
- **Left Column (2/3 width):**
  - About Event section
  - Venue Details with map links
  - Date & Time Details
  - Organizer Info card
  
- **Right Column (1/3 width) - STICKY SIDEBAR:**
  - Price display (large, prominent)
  - Buy Tickets button
  - Favorite button
  - Share button
  - Follow Organizer button
  - Tickets remaining counter
  - Almost sold out warning

### 3. **About Event Section** ✅ Mobile Has This
- Sparkles icon
- Pre-formatted description
- Tags section with badges

### 4. **Venue Details Section** ✅ Mobile Has This
- MapPin icon
- Venue name
- Full address
- Apple Maps link
- Google Maps link

### 5. **Date & Time Section** ✅ Mobile Has This
- Clock icon
- Start date/time (full format)
- End date/time (if available)

### 6. **Organizer Section** ✅ Mobile Has This
- Users icon
- Avatar with gradient background
- Organizer name
- Verified badge
- Clickable link to organizer profile

### 7. **Related Events Section** ⚠️ Check If Mobile Has
- "Similar Events" heading
- Grid of 3 event cards
- Shows events in same category

---

## MISSING FEATURES ON MOBILE

### High Priority:
1. **Premium Badge System**
   - VIP badge (price > 100)
   - Trending badge (tickets_sold > 10)
   - Sold Out badge
   - Almost Sold Out badge (remaining < 10)

2. **Enhanced Hero Section**
   - Dark gradient overlay on banner
   - Key info grid with colored icon backgrounds
   - Larger, more prominent title

3. **Sticky Sidebar (Desktop)**
   - Price prominently displayed
   - All action buttons grouped
   - Tickets remaining counter
   - Almost sold out warning

4. **Follow Organizer Button**
   - Allow users to follow organizers
   - Show follow status

5. **Related Events Section**
   - Show similar events at bottom
   - Grid layout with event cards

### Medium Priority:
6. **Map Integration**
   - Apple Maps link
   - Google Maps link
   - Or embedded map view

7. **Tags Display**
   - Show event tags as badges
   - Clickable to filter by tag

8. **Enhanced Styling**
   - Card shadows (shadow-soft)
   - Border colors (border-gray-100)
   - Rounded corners (rounded-2xl)
   - Color-coded icon backgrounds

---

## IMPLEMENTATION NOTES

### Badge Logic:
```typescript
const isVIP = (event.ticket_price || 0) > 100
const isTrending = (event.tickets_sold || 0) > 10
const selloutSoon = !isSoldOut && remainingTickets < 10
```

### Key Info Cards Styling:
- **Date Card**: accent-500 background (orange/coral)
- **Location Card**: brand-500 background (primary blue)
- **Tickets Card**: purple-500 background

### Color Scheme:
- White cards on gray-50 background
- Border: gray-100
- Shadow: subtle (shadow-soft)
- Accent: brand-600 (primary)

### Responsive Behavior:
- **Mobile**: Single column, accordions for content
- **Desktop**: Two-column with sticky sidebar
- **Hero**: Different layouts for mobile vs desktop

---

## CURRENT MOBILE IMPLEMENTATION STATUS

### ✅ Implemented:
- Hero banner image
- Category badge
- Event title
- Sticky buy button bar
- Share and favorite buttons
- Key info cards (date, location, tickets)
- Accordion sections
- About, venue, date/time, organizer info
- Navigation to organizer profile

### ❌ Not Implemented:
- Premium badges (VIP, Trending, Sold Out warnings)
- Enhanced hero with gradient overlay
- Key info grid with colored backgrounds
- Follow organizer button
- Related events section
- Map integration (Apple/Google Maps links)
- Tags display
- Desktop two-column layout
- Sticky sidebar with grouped actions

### ⚠️ Needs Enhancement:
- Hero section styling (gradient, larger title)
- Info cards styling (colored icon backgrounds)
- Badge system implementation
- Action buttons grouping
- Tickets remaining display

