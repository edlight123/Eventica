import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  loadConnectAndInitialize,
} from '@stripe/stripe-react-native'

import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendJson } from '../../lib/api/backend'

type Params = {
  /** Forwarded to /connect for first-time account creation. */
  accountLocation?: 'united_states' | 'canada' | 'france'
  /** Debug switch: attempt the RN SDK's native embedded component first. */
  tryNative?: boolean
}

/**
 * Stripe Connect onboarding via the RN SDK's NATIVE embedded component.
 *
 * The previous approach — our /organizer/onboarding web page inside a plain
 * WebView — hung on an infinite spinner: Express accounts require Stripe user
 * authentication, which the web embedded component presents in a POPUP, and
 * react-native-webview silently drops window.open. Stripe's own
 * ConnectAccountOnboarding manages those "necessary popups" itself, so the
 * flow completes while the organizer stays inside Tikèm.
 *
 * Flow: POST /connect {embedded:true} (creates the Express account if needed,
 * we ignore the returned page URL) → POST /account-session for the client
 * secret + publishable key → render the native component. Any failure falls
 * back to the Stripe-HOSTED account link in the existing WebView screen,
 * which predates the embedded experiment and is known to work.
 */
export default function StripeOnboardingScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const insets = useSafeAreaInsets()

  const { accountLocation, tryNative } = (route.params || {}) as Params

  const [connectInstance, setConnectInstance] = useState<ReturnType<
    typeof loadConnectAndInitialize
  > | null>(null)
  // goBack must run exactly once whether the user finishes, bails, or we fail
  // over — the native component can fire onExit after we've already left.
  const closedRef = useRef(false)
  const fallbackRef = useRef(false)
  // Watchdog: Stripe's embedded page fires onLoaderStart when content is
  // actually visible. A tester sat on an infinite spinner when the component
  // initialized but its inner page never came up (browser repro of the same
  // init contract works, so the stall is device-side) — never leave the
  // organizer stuck; fail over to the hosted flow instead.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const closeOnce = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    clearWatchdog()
    navigation.goBack()
  }, [clearWatchdog, navigation])

  // Hosted account link in the existing WebView — the pre-embedded flow.
  const fallbackToHosted = useCallback(async () => {
    if (fallbackRef.current || closedRef.current) return
    fallbackRef.current = true
    clearWatchdog()
    try {
      const res = await backendJson<{ url?: string }>('/api/organizer/stripe/connect', {
        method: 'POST',
        body: JSON.stringify(accountLocation ? { accountLocation } : {}),
      })
      if (res?.url && !closedRef.current) {
        closedRef.current = true
        navigation.replace('StripeConnectWebView', { url: res.url })
        return
      }
    } catch {
      // fall through to plain close
    }
    closeOnce()
  }, [accountLocation, clearWatchdog, closeOnce, navigation])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Hosted-first: on the tester's device the native component's content
      // never became visible ("no spins but still nada" — black screen even
      // after its loader claimed to start), while the hosted account link
      // completed onboarding end to end. Until the native rendering issue is
      // isolated, organizers go straight to the flow that works; pass
      // tryNative to exercise the embedded path when debugging.
      if (!tryNative) {
        void fallbackToHosted()
        return
      }
      try {
        // Account bootstrap lives in /connect; embedded:true skips the hosted
        // account link. The page URL it returns is for the web flow — unused here.
        await backendJson('/api/organizer/stripe/connect', {
          method: 'POST',
          body: JSON.stringify({ ...(accountLocation ? { accountLocation } : {}), embedded: true }),
        })

        const session = await backendJson<{ clientSecret?: string; publishableKey?: string }>(
          '/api/organizer/stripe/account-session',
          { method: 'POST' }
        )
        if (cancelled) return
        if (!session?.clientSecret || !session?.publishableKey) {
          void fallbackToHosted()
          return
        }

        const instance = loadConnectAndInitialize({
          publishableKey: session.publishableKey,
          fetchClientSecret: async () => {
            const next = await backendJson<{ clientSecret?: string }>(
              '/api/organizer/stripe/account-session',
              { method: 'POST' }
            )
            if (!next?.clientSecret) throw new Error('No client secret')
            return next.clientSecret
          },
          // Same palette as the web page's Appearance config: near-black
          // surfaces, teal accent, white primary.
          appearance: {
            variables: {
              colorPrimary: '#14B8A6',
              colorBackground: '#0A0A0A',
              colorText: '#FFFFFF',
              colorSecondaryText: '#A3A3A3',
              colorBorder: '#262626',
              colorDanger: '#F87171',
              buttonPrimaryColorBackground: '#FFFFFF',
              buttonPrimaryColorText: '#0A0A0A',
            },
          } as any,
        })
        setConnectInstance(instance)
        // Content must announce itself (onLoaderStart) within this window or
        // we hand the organizer to the hosted flow instead of a dead spinner.
        watchdogRef.current = setTimeout(() => void fallbackToHosted(), 15000)
      } catch {
        if (!cancelled) void fallbackToHosted()
      }
    })()
    return () => {
      cancelled = true
      clearWatchdog()
    }
  }, [accountLocation, clearWatchdog, fallbackToHosted, tryNative])

  const styles = getStyles(colors)

  if (!connectInstance) {
    // Bootstrap state: account + session mint in flight. Keep a close
    // affordance so a slow network never traps the organizer here.
    return (
      <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={closeOnce}
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('screens.stripeConnect.title')}
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <NativeOnboardingBoundary onError={fallbackToHosted}>
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding
            title={t('screens.stripeConnect.title')}
            onExit={closeOnce}
            onLoaderStart={clearWatchdog}
            onLoadError={() => void fallbackToHosted()}
          />
        </ConnectComponentsProvider>
      </NativeOnboardingBoundary>
    </View>
  )
}

/**
 * If the installed binary somehow predates the SDK's Connect native view,
 * rendering it throws — catch that and fail over to the hosted flow instead
 * of crashing the screen.
 */
class NativeOnboardingBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 8,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    loadingBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
