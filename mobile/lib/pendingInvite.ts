import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@Eventica:pendingInvite'

export type PendingInvite = {
  eventId: string
  token: string
}

export async function setPendingInvite(invite: PendingInvite) {
  await AsyncStorage.setItem(KEY, JSON.stringify(invite))
}

export async function getPendingInvite(): Promise<PendingInvite | null> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.eventId === 'string' && typeof parsed?.token === 'string') {
      return { eventId: parsed.eventId, token: parsed.token }
    }
    return null
  } catch {
    return null
  }
}

export async function clearPendingInvite() {
  await AsyncStorage.removeItem(KEY)
}
