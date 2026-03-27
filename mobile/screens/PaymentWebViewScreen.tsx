import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { COLORS } from '../config/brand'
import { auth } from '../config/firebase'
import { clearPendingPayment, setPendingPayment } from '../lib/pendingPayment'
import { setTicketsRefreshHint } from '../lib/ticketsRefreshHint'
import { useI18n } from '../contexts/I18nContext'

type Params = {
  url: string
  title?: string
  authToken?: string | null
  eventId?: string
}

export default function PaymentWebViewScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { url, authToken, title, eventId } = (route.params || {}) as Params
  const { t } = useI18n()

  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [handledTerminal, setHandledTerminal] = useState(false)
  const [resolvedAuthToken, setResolvedAuthToken] = useState<string | null>(authToken || null)

  const needsAuthHeader = useMemo(() => {
    if (!url) return false
    // MonCash checkout endpoint requires auth to render the form.
    return url.includes('/api/moncash-button/checkout') || url.includes('/api/moncash-button/initiate')
  }, [url])

  useEffect(() => {
    if (!url) return
    setPendingPayment({ url, title, eventId }).catch(() => {})
  }, [eventId, title, url])

  useEffect(() => {
    if (!needsAuthHeader) return
    if (resolvedAuthToken) return
    const current = auth.currentUser
    if (!current) return
    current
      .getIdToken()
      .then((t) => setResolvedAuthToken(t))
      .catch(() => setResolvedAuthToken(null))
  }, [needsAuthHeader, resolvedAuthToken])

  const finishWithSuccess = useCallback(() => {
    if (handledTerminal) return
    setHandledTerminal(true)

    clearPendingPayment().catch(() => {})
    setTicketsRefreshHint({ reason: 'payment', createdAt: Date.now() }).catch(() => {})

    Alert.alert(t('screens.payment.successTitle'), t('screens.payment.successBody'), [
      {
        text: t('common.ok'),
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Tickets' } }],
          })
        },
      },
    ])
  }, [handledTerminal, navigation, t])

  const finishWithFailure = useCallback(
    (message?: string) => {
      if (handledTerminal) return
      setHandledTerminal(true)

      clearPendingPayment().catch(() => {})

      Alert.alert(t('screens.payment.failedTitle'), message || t('screens.payment.failedBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ])
    },
    [handledTerminal, navigation, t]
  )

  const onNavChange = useCallback(
    (nextUrl: string) => {
      if (!nextUrl || handledTerminal) return

      // Our backend redirects to these pages on terminal outcomes.
      if (nextUrl.includes('/purchase/success')) {
        finishWithSuccess()
        return
      }

      if (nextUrl.includes('/purchase/failed')) {
        const reason = (() => {
          try {
            const parsed = new URL(nextUrl)
            return parsed.searchParams.get('reason') || ''
          } catch {
            return ''
          }
        })()
        finishWithFailure(reason ? `${t('screens.payment.reasonPrefix')}${reason}` : undefined)
      }
    },
    [finishWithFailure, finishWithSuccess, handledTerminal, t]
  )

  if (!url) {
    return <View style={styles.center} />
  }

  if (needsAuthHeader && !resolvedAuthToken) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          uri: url,
          headers: resolvedAuthToken ? { Authorization: `Bearer ${resolvedAuthToken}` } : undefined,
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state) => onNavChange(state.url)}
        onMessage={(event) => {
          try {
            const raw = event?.nativeEvent?.data
            if (!raw) return
            const parsed = JSON.parse(String(raw))
            if (parsed?.source !== 'eventica' || parsed?.type !== 'purchase_result') return

            if (parsed?.status === 'success') {
              finishWithSuccess()
              return
            }
            if (parsed?.status === 'failed') {
              const reason = typeof parsed?.reason === 'string' ? parsed.reason : ''
              finishWithFailure(reason ? `${t('screens.payment.reasonPrefix')}${reason}` : undefined)
            }
          } catch {
            // ignore
          }
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
})
