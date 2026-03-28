import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, SafeAreaView, Text, TouchableOpacity, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { RootStackParamList } from '../navigation/AppNavigator'
import { useAuth } from '../contexts/AuthContext'
import { useAppMode } from '../contexts/AppModeContext'
import { clearPendingInvite, setPendingInvite } from '../lib/pendingInvite'
import { deleteStaffInviteNotificationsByEvent, deleteStaffInviteNotificationsByToken } from '../lib/notifications'
import { addStaffEventId } from '../lib/staffAssignments'
import { backendJson } from '../lib/api/backend'
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteRedeem'>

function getFriendlyError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('invite expired')) return 'This invite link has expired. Ask the organizer for a new one.'
  if (lower.includes('already claimed')) return 'This invite link was already used. Ask the organizer for a new one.'
  if (lower.includes('invite was revoked')) return 'This invite link was revoked. Ask the organizer for a new one.'
  if (lower.includes('authentication required')) return 'Please log in to accept this invite.'
  if (lower.includes('restricted to a different email')) return 'This invite is restricted to a different email address.'
  if (lower.includes('restricted to a different phone')) return 'This invite is restricted to a different phone number.'
  if (lower.includes('invite email mismatch')) return 'This invite is restricted to a different email address.'
  if (lower.includes('invite phone mismatch')) return 'This invite is restricted to a different phone number.'
  return message
}

export default function InviteRedeemScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth()
  const { setMode } = useAppMode()

  const eventId = useMemo(() => String((route.params as any)?.eventId || ''), [route.params])
  const token = useMemo(() => String((route.params as any)?.token || ''), [route.params])

  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    // If we arrived via deep link, persist it so a login roundtrip can continue.
    if (eventId && token) {
      setPendingInvite({ eventId, token }).catch(() => {})
    }
  }, [eventId, token])

  useEffect(() => {
    const redeem = async () => {
      if (!eventId || !token) {
        setStatus('error')
        setMessage('Invalid invite link.')
        return
      }

      if (!user) {
        setStatus('idle')
        setMessage('Log in to accept this invite.')
        return
      }

      setStatus('working')
      setMessage('Accepting invite…')

      try {
        await backendJson('/api/staff/invites/redeem', {
          method: 'POST',
          body: JSON.stringify({ eventId, token }),
        })

        // Persist so Staff tabs can show it immediately.
        addStaffEventId(eventId).catch(() => {})

        // Auto-clear any matching notification that led to this invite.
        if (user?.uid) {
          deleteStaffInviteNotificationsByToken(user.uid, { eventId, token }).catch(() => {})
          // Some notifications don't store the token; clear by eventId too.
          deleteStaffInviteNotificationsByEvent(user.uid, { eventId }).catch(() => {})
        }

        await clearPendingInvite()
        await setMode('staff')

        setStatus('success')
        setMessage('Invite accepted. You can now check in attendees.')

        // Jump straight into the scanner for this event.
        navigation.navigate('Main' as any)
        navigation.navigate('TicketScanner' as any, { eventId })
      } catch (e: any) {
        const raw = e?.message ? String(e.message) : 'Failed to accept invite.'

        // If the invite is already claimed, the notification is stale — clear it.
        if (user?.uid && raw.toLowerCase().includes('already claimed')) {
          deleteStaffInviteNotificationsByToken(user.uid, { eventId, token }).catch(() => {})
          deleteStaffInviteNotificationsByEvent(user.uid, { eventId }).catch(() => {})
        }

        setStatus('error')
        setMessage(getFriendlyError(raw))
      }
    }

    redeem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId, token])

  const goToLogin = () => {
    navigation.navigate('Auth' as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background || '#fff' }}>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Accept Staff Invite
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
            This will grant event-scoped check-in access.
          </Text>

          {status === 'working' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: colors.textSecondary }}>{message}</Text>
            </View>
          ) : (
            <Text style={{ color: status === 'error' ? '#B91C1C' : colors.textSecondary, marginBottom: 16 }}>{message}</Text>
          )}

          {!user && (
            <TouchableOpacity
              onPress={goToLogin}
              style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Log in</Text>
            </TouchableOpacity>
          )}

          {status === 'error' && user ? (
            <TouchableOpacity
              onPress={() => {
                setStatus('idle')
                setMessage('')
                // trigger effect by navigating to same route? simplest: just re-run by setting message; user can reopen link.
              }}
              style={{ marginTop: 10, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  )
}
