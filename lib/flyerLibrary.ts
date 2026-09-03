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
  /**
   * What an organizer would type looking for this. Searching only the label
   * fails the moment someone types "konpa" or "dj" instead of "stage lights",
   * so each piece carries the words for the kind of night it suits.
   */
  tags: string[]
}

const unsplash = (photo: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${photo}?w=${w}&h=${h}&fit=crop&q=80`

/** Full-size 4:5 poster, what gets saved as banner_image_url. */
export const flyerLibraryFullUrl = (item: FlyerLibraryItem) => unsplash(item.photo, 1200, 1500)

/** Grid thumbnail — small on purpose, the picker shows fifteen at once. */
export const flyerLibraryThumbUrl = (item: FlyerLibraryItem) => unsplash(item.photo, 320, 400)

export const FLYER_LIBRARY: readonly FlyerLibraryItem[] = [
  { id: 'stageLights', photo: '1516450360452-9312f5e86fc7', label: 'Stage lights', tags: ['concert','konpa','music','live','stage','band','dj','night'] },
  { id: 'crowdGold', photo: '1470229722913-7c0e2dbbafd3', label: 'Crowd in gold', tags: ['concert','festival','crowd','music','konpa','party','warm'] },
  { id: 'confetti', photo: '1492684223066-81342ee5ff30', label: 'Confetti', tags: ['party','fèt','celebration','new year','confetti','birthday'] },
  { id: 'fromTheStage', photo: '1533174072545-7a4b6ad7a6c3', label: 'From the stage', tags: ['concert','festival','crowd','stage','live','music'] },
  { id: 'handsUp', photo: '1429962714451-bb934ecdc4ec', label: 'Hands up', tags: ['party','fèt','club','dj','dance','crowd','night'] },
  { id: 'smokeAndLight', photo: '1493225457124-a3eb161ffa5f', label: 'Smoke and light', tags: ['party','club','dj','rap','smoke','night','performance'] },
  { id: 'brass', photo: '1511192336575-5a79af67a629', label: 'Brass', tags: ['jazz','konpa','twoubadou','brass','band','live','music'] },
  { id: 'festival', photo: '1514525253161-7a46d19cd819', label: 'Festival night', tags: ['festival','carnival','kanaval','concert','lights','music'] },
  { id: 'paint', photo: '1460661419201-fd4cecdf8a8b', label: 'Paint', tags: ['art','kilti','culture','exhibition','workshop','paint'] },
  { id: 'table', photo: '1555939594-58d7cb561ad1', label: 'The table', tags: ['food','manje','dinner','restaurant','tasting','gala'] },
  { id: 'worship', photo: '1438232992991-995b7058bbb3', label: 'Worship', tags: ['church','worship','gospel','religious','service','praise'] },
  { id: 'startLine', photo: '1461896836934-ffe607ba8211', label: 'Start line', tags: ['sports','espò','race','running','marathon','athletics'] },
  { id: 'darkRoom', photo: '1540575467063-178a50c2df87', label: 'Full room', tags: ['conference','business','talk','panel','summit','audience'] },
  { id: 'workshop', photo: '1557426272-fc759fdf7a8d', label: 'Workshop', tags: ['workshop','training','class','business','team','meeting'] },
  { id: 'classroom', photo: '1503676260728-1c00da094a0b', label: 'Classroom', tags: ['education','school','class','students','learning','training'] },
]
