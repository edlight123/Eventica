import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@Eventica:ticketsRefreshHint'

export type TicketsRefreshHint = {
  reason: 'payment'
  createdAt: number
}

export async function setTicketsRefreshHint(hint: TicketsRefreshHint) {
  await AsyncStorage.setItem(KEY, JSON.stringify(hint))
}

export async function consumeTicketsRefreshHint(maxAgeMs: number): Promise<TicketsRefreshHint | null> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const createdAt = typeof parsed?.createdAt === 'number' ? parsed.createdAt : 0
    const reason = parsed?.reason === 'payment' ? 'payment' : null

    await AsyncStorage.removeItem(KEY)

    if (!reason || !createdAt) return null
    if (Date.now() - createdAt > maxAgeMs) return null

    return { reason, createdAt }
  } catch {
    await AsyncStorage.removeItem(KEY)
    return null
  }
}
