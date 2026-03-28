import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'

import { useTheme } from '../contexts/ThemeContext';

type Params = {
  url: string
}

export default function StripeConnectWebViewScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const insets = useSafeAreaInsets()

  const { url } = (route.params || {}) as Params
  const [loading, setLoading] = useState(true)

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

  if (!url) {
    return <View style={[styles.container, { paddingTop: insets.top }]} />
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stripe Connect</Text>
        <View style={{ width: 44 }} />
      </View>

      <WebView
        source={{ uri: url }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state) => {
          if (shouldCloseForUrl(state.url)) {
            navigation.goBack()
          }
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
})
