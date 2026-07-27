import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Skeleton } from '../components/Skeleton';
import { font } from '../theme/tokens';
import type { ContentBlock, ContentPage } from '../types/contentPage';

/**
 * Renders a legal/help page from Firestore `content_pages/{slug}` NATIVELY in
 * POSH style — the same single source the web app renders, so mobile never
 * drifts from the canonical terms / privacy / refunds / support copy.
 *
 * Route params: { slug: string; title?: string }. The optional `title` fills
 * the header immediately (no empty bar while loading); the doc's own title
 * replaces it once loaded. Content is cached in AsyncStorage after a successful
 * load so it still renders offline (mirrors TicketDetailScreen's pattern).
 */
export default function ContentPageScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const slug: string = route?.params?.slug;
  const routeTitle: string | undefined = route?.params?.title;

  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const cacheKey = `content_page_cache_${slug}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const snap = await getDoc(doc(db, 'content_pages', slug));
      if (snap.exists()) {
        const data = { slug, ...(snap.data() as any) } as ContentPage;
        setPage(data);
        // Cache the doc JSON so legal/help content works with no signal.
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
      } else {
        // No live doc — try the last cached copy before giving up.
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) setPage(JSON.parse(raw));
        else setFailed(true);
      }
    } catch {
      // Offline / fetch error — hydrate from cache so the page still renders.
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) setPage(JSON.parse(raw));
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  const headerTitle = page?.title || routeTitle || '';

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {headerTitle}
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {header}

      {loading ? (
        <ContentSkeleton colors={colors} />
      ) : failed || !page ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{t('contentPage.unavailableTitle')}</Text>
          <Text style={styles.emptyBody}>{t('contentPage.unavailableBody')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
            <RotateCcw size={16} color={colors.text} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>{page.title}</Text>
          {page.updated ? (
            <Text style={styles.updated}>
              {t('contentPage.updatedPrefix')} {page.updated}
            </Text>
          ) : null}

          <View style={styles.blocks}>
            {page.blocks?.map((block, i) => (
              <Block key={i} block={block} styles={styles} colors={colors} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Block({
  block,
  styles,
  colors,
}: {
  block: ContentBlock;
  styles: ReturnType<typeof getStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={block.level === 3 ? styles.heading3 : styles.heading2}>{block.text}</Text>
      );
    case 'paragraph':
      return <Text style={styles.paragraph}>{block.text}</Text>;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items?.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listMarker}>{block.ordered ? `${i + 1}.` : '•'}</Text>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'callout':
      return (
        <View style={styles.callout}>
          {block.title ? <Text style={styles.calloutTitle}>{block.title}</Text> : null}
          {block.text ? <Text style={styles.calloutText}>{block.text}</Text> : null}
          {block.items?.length ? (
            <View style={styles.calloutList}>
              {block.items.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.calloutMarker}>•</Text>
                  <Text style={styles.calloutText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

/** Content skeleton: a title line, a caption, and a few heading/paragraph blocks. */
function ContentSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ padding: 20 }}>
      <Skeleton width={'70%'} height={30} radius={8} />
      <Skeleton width={'34%'} height={12} radius={6} style={{ marginTop: 12 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={{ marginTop: 28 }}>
          <Skeleton width={'46%'} height={18} radius={7} />
          <Skeleton width={'100%'} height={13} radius={6} style={{ marginTop: 14 }} />
          <Skeleton width={'96%'} height={13} radius={6} style={{ marginTop: 8 }} />
          <Skeleton width={'88%'} height={13} radius={6} style={{ marginTop: 8 }} />
          <Skeleton width={'64%'} height={13} radius={6} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 10,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: font.serif, fontSize: 22, color: colors.text },
    scroll: { flex: 1 },

    pageTitle: {
      fontFamily: font.serif,
      fontSize: 32,
      lineHeight: 36,
      color: colors.text,
    },
    updated: {
      fontFamily: font.monoRegular,
      fontSize: 12,
      letterSpacing: 0.3,
      color: colors.textTertiary,
      marginTop: 8,
    },
    blocks: {
      marginTop: 20,
    },

    heading2: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginTop: 28,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 20,
      marginBottom: 2,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      marginTop: 12,
    },

    list: {
      marginTop: 12,
      gap: 8,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    listMarker: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      width: 22,
    },
    listText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
    },

    // POSH callout: left teal accent bar on a teal-tinted raised box.
    callout: {
      marginTop: 20,
      backgroundColor: colors.primarySoft,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    calloutTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    calloutText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    calloutList: {
      marginTop: 4,
      gap: 6,
    },
    calloutMarker: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.primary,
      width: 18,
    },

    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: colors.surfaceRaised,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });
