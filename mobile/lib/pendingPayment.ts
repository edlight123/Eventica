import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@Eventica:pendingPayment'

export type PendingPayment = {
  url: string
  title?: string
  eventId?: string
  createdAt: number
}

export async function setPendingPayment(payment: Omit<PendingPayment, 'createdAt'> & { createdAt?: number }) {
  const payload: PendingPayment = {
    ...payment,
    createdAt: typeof payment.createdAt === 'number' ? payment.createdAt : Date.now(),
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(payload))
}

export async function getPendingPayment(): Promise<PendingPayment | null> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.url !== 'string') return null
    return {
      url: parsed.url,
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      eventId: typeof parsed.eventId === 'string' ? parsed.eventId : undefined,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    }
  } catch {
    return null
  }
}

export async function clearPendingPayment() {
  await AsyncStorage.removeItem(KEY)
}
