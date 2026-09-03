/**
 * The flyer library — ready-made artwork for organizers with no poster.
 *
 * The uploader alone assumes the organizer already has a designed flyer. Most
 * first-time organizers on /create do not, and an event with no image is the
 * single worst-performing card on Discover. So the flyer slot offers a second
 * door: pick a piece of artwork, one click, no file, no designer.
 *
 * These are Unsplash CDN URLs, which the app already relies on: the host is in
 * `next.config.js` remotePatterns AND in the enforcing CSP's `img-src`, so a
 * picked flyer renders everywhere a real upload does. Every id here was
 * verified to resolve before being added — an id that 404s is an event with a
 * broken poster, which is worse than no library at all.
 *
 * `label` is a plain English fallback; the picker translates
 * `composer.flyerLib.<id>` when a locale has it.
 */

export interface FlyerLibraryItem {
  /** Stable key, also the i18n suffix. */
  id: string
  /** Unsplash photo id (the `photo-…` path segment). */
  photo: string
  label: string
}

const unsplash = (photo: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${photo}?w=${w}&h=${h}&fit=crop&q=80`

/** Full-size 4:5 poster, what gets saved as banner_image_url. */
export const flyerLibraryFullUrl = (item: FlyerLibraryItem) => unsplash(item.photo, 1200, 1500)

/** Grid thumbnail — small on purpose, the picker shows fifteen at once. */
export const flyerLibraryThumbUrl = (item: FlyerLibraryItem) => unsplash(item.photo, 320, 400)

export const FLYER_LIBRARY: readonly FlyerLibraryItem[] = [
  { id: 'stageLights', photo: '1516450360452-9312f5e86fc7', label: 'Stage lights' },
  { id: 'crowdGold', photo: '1470229722913-7c0e2dbbafd3', label: 'Crowd in gold' },
  { id: 'confetti', photo: '1492684223066-81342ee5ff30', label: 'Confetti' },
  { id: 'fromTheStage', photo: '1533174072545-7a4b6ad7a6c3', label: 'From the stage' },
  { id: 'handsUp', photo: '1429962714451-bb934ecdc4ec', label: 'Hands up' },
  { id: 'smokeAndLight', photo: '1493225457124-a3eb161ffa5f', label: 'Smoke and light' },
  { id: 'brass', photo: '1511192336575-5a79af67a629', label: 'Brass' },
  { id: 'festival', photo: '1514525253161-7a46d19cd819', label: 'Festival night' },
  { id: 'paint', photo: '1460661419201-fd4cecdf8a8b', label: 'Paint' },
  { id: 'table', photo: '1555939594-58d7cb561ad1', label: 'The table' },
  { id: 'worship', photo: '1438232992991-995b7058bbb3', label: 'Worship' },
  { id: 'startLine', photo: '1461896836934-ffe607ba8211', label: 'Start line' },
  { id: 'darkRoom', photo: '1540575467063-178a50c2df87', label: 'Full room' },
  { id: 'workshop', photo: '1557426272-fc759fdf7a8d', label: 'Workshop' },
  { id: 'classroom', photo: '1503676260728-1c00da094a0b', label: 'Classroom' },
]
