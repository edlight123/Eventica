/**
 * Formatting shared by the organizer detail cards.
 *
 * Both helpers are defensive on purpose: this screen renders raw Firestore
 * documents whose shapes have drifted over the years, and a value that turns
 * out to be an object where a string was expected takes the whole page down
 * with React error #31.
 */

/** Renders any value as a string so an unexpected object cannot crash the tree. */
export function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * ISO-sliced rather than locale-formatted: the server and the client must
 * produce the same characters or the page hydrates with a mismatch.
 */
export function formatDate(dateStr: any, includeTime: boolean = true): string {
  if (!dateStr) return 'Unknown'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Unknown'
    if (includeTime) {
      return date.toISOString().replace('T', ' ').slice(0, 19)
    }
    return date.toISOString().slice(0, 10)
  } catch {
    return 'Unknown'
  }
}
