import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'

import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext'
import { Skeleton } from '../components/Skeleton'

type Params = {
  url: string
}

export default function StripeConnectWebViewScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t } = useI18n()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const insets = useSafeAreaInsets()

  const { url } = (route.params || {}) as Params
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // Bumping this remounts the WebView, which re-requests the ORIGINAL account
  // link rather than whatever half-loaded deep URL failed.
  const [reloadKey, setReloadKey] = useState(0)
  // Set once Stripe redirects to a return/refresh URL: from that point the
  // screen is finishing normally, so no error state and no cancel-confirm.
  const handledTerminal = useRef(false)
  // Last URL the main frame actually tried to load — used to ignore sub-resource
  // HTTP errors (analytics/beacons on Stripe's page) that aren't real failures.
  const mainFrameUrl = useRef<string>(url)

  // Host shown as a lock + hostname trust cue (e.g. "connect.stripe.com"). For a
  // page that asks for bank details this is a genuine anti-phishing signal.
  const hostLabel = useMemo(() => {
    try {
      return new URL(url).host.replace(/^www\./, '')
    } catch {
      return ''
    }
  }, [url])

  const terminalMatchers = useMemo(() => {
    // Stripe will redirect to these (webapp) URLs; we close the WebView and let the
    // payout settings screen refresh status on focus.
    return ['?stripe=return', '?stripe=refresh', '&stripe=return', '&stripe=refresh']
  }, [])

  const shouldCloseForUrl = useCallback(
    (nextUrl: string) => {
      if (!nextUrl) return false
      return terminalMatchers.some((m) => nextUrl.includes(m))
    },
    [terminalMatchers]
  )

  const handleTryAgain = useCallback(() => {
    setFailed(false)
    setLoading(true)
    mainFrameUrl.current = url
    setReloadKey((k) => k + 1)
  }, [url])

  // Abandoning halfway leaves a half-onboarded Connect account, so confirm before
  // a genuine mid-flow dismissal. The terminal return/refresh redirect closes the
  // screen directly and never reaches this.
  const handleRequestClose = useCallback(() => {
    if (handledTerminal.current || failed) {
      navigation.goBack()
      return
    }
    Alert.alert(
      t('screens.stripeConnect.leaveTitle'),
      t('screens.stripeConnect.leaveBody'),
      [
        { text: t('screens.stripeConnect.keepGoing'), style: 'cancel' },
        {
          text: t('screens.stripeConnect.leave'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    )
  }, [failed, navigation])

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        onPress={handleRequestClose}
        style={styles.headerButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('screens.stripeConnect.title')}
        </Text>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          <Text style={styles.secureText} numberOfLines={1}>
            {hostLabel || t('screens.stripeConnect.secure')}
          </Text>
        </View>
      </View>
      {/* Spacer to keep the title centered opposite the close button. */}
      <View style={styles.headerButton} />
    </View>
  )

  // Content-shaped loading state: mirrors the shape of Stripe's hosted
  // onboarding page (heading, a few labelled fields, a continue button) using the
  // shared Skeleton primitive instead of a bare centered spinner.
  const brandedLoading = (
    <View style={[styles.loadingOverlay, { paddingTop: insets.top + 72 }]}>
      <View style={styles.onboardingSkeleton}>
        <Skeleton width={'62%'} height={26} radius={8} />
        <Skeleton width={'88%'} height={13} radius={6} style={{ marginTop: 12 } as ViewStyle} />
        <Skeleton width={'54%'} height={13} radius={6} style={{ marginTop: 8 } as ViewStyle} />

        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonField}>
            <Skeleton width={i === 1 ? '46%' : '36%'} height={12} radius={5} />
            <Skeleton height={50} radius={12} style={{ marginTop: 10 } as ViewStyle} />
          </View>
        ))}

        <Skeleton height={52} radius={12} style={{ marginTop: 30 } as ViewStyle} />
      </View>
    </View>
  )

  // Branded failure state instead of a blank white page, rendered over the
  // still-mounted WebView so the header (and its close affordance) stays usable.
  const brandedFailure = failed ? (
    <View style={styles.failureOverlay}>
      <View style={styles.failureContent}>
        <View style={styles.failureIconRing}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.error} />
        </View>
        <Text style={styles.failureTitle}>{t('screens.stripeConnect.failedTitle')}</Text>
        <Text style={styles.failureBody}>{t('screens.stripeConnect.failedBody')}</Text>
        <TouchableOpacity
          style={styles.failurePrimaryButton}
          onPress={handleTryAgain}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('screens.stripeConnect.tryAgain')}
        >
          <Text style={styles.failurePrimaryButtonText}>{t('screens.stripeConnect.tryAgain')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.failureGhostButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('screens.stripeConnect.backToPayouts')}
        >
          <Text style={styles.failureGhostButtonText}>{t('screens.stripeConnect.backToPayouts')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null

  if (!url) {
    return <View style={[styles.container, { paddingTop: insets.top }]} />
  }

  return (
    <View style={styles.container}>
      {header}

      <WebView
        key={reloadKey}
        source={{ uri: url }}
        onLoadStart={(event) => {
          const next = event?.nativeEvent?.url
          if (next) mainFrameUrl.current = next
          setLoading(true)
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          if (handledTerminal.current) return
          setLoading(false)
          setFailed(true)
        }}
        onHttpError={(event) => {
          if (handledTerminal.current) return
          const { statusCode, url: errorUrl } = event?.nativeEvent || ({} as any)
          // Sub-resource failures (fonts, beacons) must not blank the flow out —
          // only a failed main-document load is a real error.
          if (errorUrl && errorUrl !== mainFrameUrl.current) return
          if (!statusCode || statusCode < 400) return
          setLoading(false)
          setFailed(true)
        }}
        onNavigationStateChange={(state) => {
          if (state.url) mainFrameUrl.current = state.url
          if (shouldCloseForUrl(state.url)) {
            handledTerminal.current = true
            navigation.goBack()
          }
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />

      {loading && !failed ? brandedLoading : null}
      {brandedFailure}
    </View>
  )
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    zIndex: 2,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
  onboardingSkeleton: {
    paddingHorizontal: 20,
  },
  skeletonField: {
    marginTop: 22,
  },
  failureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  failureContent: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  failureIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 24,
  },
  failureTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  failureBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  failurePrimaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  failurePrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  failureGhostButton: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureGhostButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
})
