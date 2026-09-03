/**
 * How much of the guest list an event shows the public.
 *
 * This used to be one boolean, `show_guestlist`, which forced a choice between
 * naming everybody and naming nobody. Neither is what most organizers want: a
 * private birthday fèt still wants "40 going" on the page as proof the night is
 * real, and a big concert wants the faces because the faces are the flyer.
 *
 * So the boolean becomes three states. The old field is still written on save
 * for anything that reads it (and so a rollback degrades to sensible), and it is
 * still read as the fallback for the thousands of events created before this.
 */

export type GuestlistVisibility = 'faces' | 'count' | 'hidden'

export const GUESTLIST_VISIBILITIES: readonly GuestlistVisibility[] = ['faces', 'count', 'hidden']

/**
 * Resolve the mode for an event document.
 *
 * Order matters: the new field wins when present, then the legacy boolean, then
 * the default. `show_guestlist === false` maps to 'hidden' rather than 'count',
 * because an organizer who switched it off asked for nothing to be shown, and
 * silently promoting them to a visible count would leak what they turned off.
 */
export function guestlistVisibilityFrom(data: {
  guestlist_visibility?: unknown
  show_guestlist?: unknown
}): GuestlistVisibility {
  const v = data?.guestlist_visibility
  if (v === 'faces' || v === 'count' || v === 'hidden') return v
  if (data?.show_guestlist === false) return 'hidden'
  return 'faces'
}

/** The legacy boolean to write alongside a mode, so old readers stay correct. */
export const showGuestlistFor = (v: GuestlistVisibility) => v !== 'hidden'
