import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Search, Camera, ImageUp } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { backendJson } from '../lib/api/backend';
import { radius, spacing } from '../theme/tokens';

/** Shape of one photo as returned by GET /api/flyers/search. */
interface RemoteFlyer {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
}

interface FlyerSearchResponse {
  configured?: boolean;
  results: RemoteFlyer[];
}

export interface SelectedFlyer {
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
}

interface FlyerLibrarySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the full-size image when the organizer taps a tile. */
  onSelect: (flyer: SelectedFlyer) => void;
  /** Called when the organizer wants to pick their own image instead. */
  onUpload: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;

/**
 * "Select a flyer" — a posh-style stock-photo library for event flyers.
 * Two-column grid of portrait Unsplash photos (proxied through our own
 * /api/flyers/search so the API key stays server-side), photographer credit
 * on every tile, and a white "Upload an image" pill for organizers who
 * brought their own artwork. When the server has no Unsplash key the grid
 * quietly disappears and only the upload path remains.
 */
export default function FlyerLibrarySheet({
  visible,
  onClose,
  onSelect,
  onUpload,
}: FlyerLibrarySheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<RemoteFlyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  // Debounce keystrokes so we hit the search API at most ~2.5x/second of
  // typing, not once per character.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);

    backendJson<FlyerSearchResponse>(
      `/api/flyers/search?q=${encodeURIComponent(debouncedQuery)}`
    )
      .then((data) => {
        if (cancelled) return;
        setConfigured(data?.configured !== false);
        setResults(Array.isArray(data?.results) ? data.results : []);
      })
      .catch(() => {
        // A failed search must never block the organizer: show the empty
        // state, keep the upload pill working.
        if (cancelled) return;
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, debouncedQuery]);

  const handleSelect = (flyer: RemoteFlyer) => {
    // Unsplash's API terms require hitting download_location when a photo is
    // actually used. Fire-and-forget: attribution bookkeeping must not delay
    // (or be able to break) the organizer's flow.
    backendJson('/api/flyers/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadLocation: flyer.downloadLocation }),
    }).catch(() => {});

    onSelect({
      url: flyer.fullUrl,
      photographer: flyer.photographer,
      photographerUrl: flyer.photographerUrl,
      downloadLocation: flyer.downloadLocation,
    });
    onClose();
  };

  const renderTile = ({ item }: { item: RemoteFlyer }) => (
    <TouchableOpacity
      style={styles.tile}
      activeOpacity={0.85}
      onPress={() => handleSelect(item)}
      accessibilityRole="imagebutton"
      accessibilityLabel={t('flyerLibrary.byPhotographer').replace('{name}', item.photographer)}
    >
      <Image
        source={{ uri: item.thumbUrl }}
        style={styles.tileImage}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={styles.tileScrim}
        pointerEvents="none"
      />
      {item.photographer ? (
        <View style={styles.credit} pointerEvents="none">
          <Camera size={11} color="#FFFFFF" />
          <Text style={styles.creditText} numberOfLines={1}>
            {item.photographer}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>{t('flyerLibrary.title')}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {configured ? (
            <View style={styles.searchBox}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={t('flyerLibrary.searchPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
          ) : null}

          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : !configured ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>{t('flyerLibrary.notConfigured')}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>{t('flyerLibrary.empty')}</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderTile}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <TouchableOpacity
            style={styles.uploadPill}
            onPress={onUpload}
            accessibilityRole="button"
          >
            <ImageUp size={18} color="#0A0A0B" />
            <Text style={styles.uploadPillText}>{t('flyerLibrary.uploadImage')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      height: '90%',
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: spacing.md,
      height: 44,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 0,
    },
    gridRow: {
      gap: spacing.sm,
    },
    gridContent: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    tile: {
      flex: 1,
      aspectRatio: 4 / 5,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: colors.surfaceRaised,
    },
    tileImage: {
      ...StyleSheet.absoluteFillObject,
    },
    tileScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '38%',
    },
    credit: {
      position: 'absolute',
      left: spacing.sm,
      right: spacing.sm,
      bottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    creditText: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    stateText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    uploadPill: {
      marginTop: spacing.md,
      height: 56,
      borderRadius: radius.button,
      backgroundColor: colors.white,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    uploadPillText: {
      fontSize: 16,
      fontWeight: '700',
      // Fixed near-black: the pill is white in every theme, so the label must
      // not follow a palette color that could also be light.
      color: '#0A0A0B',
    },
  });
