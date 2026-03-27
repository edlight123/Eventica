import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'eventica:staffEventIds'

export async function getStaffEventIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((v) => String(v)).filter(Boolean)
  } catch {
    return []
  }
}

export async function addStaffEventId(eventId: string): Promise<void> {
  const id = String(eventId || '').trim()
  if (!id) return

  const existing = await getStaffEventIds()
  if (existing.includes(id)) return

  const next = [id, ...existing].slice(0, 50)
  await AsyncStorage.setItem(KEY, JSON.stringify(next))
}

export async function removeStaffEventId(eventId: string): Promise<void> {
  const id = String(eventId || '').trim()
  if (!id) return

  const existing = await getStaffEventIds()
  const next = existing.filter((v) => v !== id)
  await AsyncStorage.setItem(KEY, JSON.stringify(next))
}
