import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'
import { useTheme } from '../contexts/ThemeContext';
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
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { url, authToken, title, eventId } = (route.params || {}) as Params
  const { t } = useI18n()

  // Host shown as a trust cue in the header (e.g. "tikem.co").
  const hostLabel = useMemo(() => {
    try {
      return new URL(url).host.replace(/^www\./, '')
    } catch {
      return ''
    }
  }, [url])

  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [handledTerminal, setHandledTerminal] = useState(false)
  const [resolvedAuthToken, setResolvedAuthToken] = useState<string | null>(authToken || null)

  // The Firebase ID token may ONLY be attached to our own trusted hosts, never
  // to an arbitrary redirect target — otherwise a hijacked/redirected checkout
  // URL could exfiltrate the bearer token to a third party.
  const isTrustedHost = useMemo(() => {
    try {
      const host = new URL(url).host.toLowerCase()
      return host === 'tikem.co' || host === 'www.tikem.co' || host === 'eventhaiti.vercel.app'
    } catch {
      return false
    }
  }, [url])

  const needsAuthHeader = useMemo(() => {
    if (!url) return false
    // MonCash checkout endpoint requires auth to render the form — but only ever
    // send it to a trusted host.
    if (!isTrustedHost) return false
    return url.includes('/api/moncash-button/checkout') || url.includes('/api/moncash-button/initiate')
  }, [url, isTrustedHost])

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

  // Closing mid-payment could drop an in-flight ticket purchase, so confirm
  // first (unless the flow already reached a terminal success/failure).
  const handleRequestClose = useCallback(() => {
    if (handledTerminal) {
      navigation.goBack()
      return
    }
    Alert.alert(t('screens.payment.cancelTitle'), t('screens.payment.cancelBody'), [
      { text: t('screens.payment.cancelKeep'), style: 'cancel' },
      {
        text: t('screens.payment.cancelConfirm'),
        style: 'destructive',
        onPress: () => {
          clearPendingPayment().catch(() => {})
          navigation.goBack()
        },
      },
    ])
  }, [handledTerminal, navigation, t])

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

  // Shared header: close (with cancel-confirm) + a secure-payment trust cue.
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleRequestClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={t('common.close')}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || t('screens.payment.headerTitle')}
        </Text>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          <Text style={styles.secureText} numberOfLines={1}>
            {hostLabel || t('screens.payment.secure')}
          </Text>
        </View>
      </View>
      {/* Spacer to keep the title centered opposite the close button. */}
      <View style={styles.headerButton} />
    </View>
  )

  const brandedLoading = (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{t('screens.payment.connecting')}</Text>
    </View>
  )

  if (!url) {
    return <View style={styles.center} />
  }

  if (needsAuthHeader && !resolvedAuthToken) {
    return (
      <View style={styles.container}>
        {header}
        {brandedLoading}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {header}
      <WebView
        ref={webViewRef}
        source={{
          uri: url,
          headers:
            resolvedAuthToken && isTrustedHost
              ? { Authorization: `Bearer ${resolvedAuthToken}` }
              : undefined,
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state) => onNavChange(state.url)}
        onMessage={(event) => {
          try {
            const raw = event?.nativeEvent?.data
            if (!raw) return
            const parsed = JSON.parse(String(raw))
            if (parsed?.source !== 'tikem' || parsed?.type !== 'purchase_result') return

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

      {loading ? brandedLoading : null}
    </View>
  )
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  secureText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: colors.textSecondary,
  },
})
