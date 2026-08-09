import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { backendJson } from '../lib/api/backend';
import { radius, spacing } from '../theme/tokens';

/** Mirrors the server's TOPICS union — anything else is rejected by the route. */
const TOPICS = ['event', 'ticket', 'other'] as const;
type Topic = (typeof TOPICS)[number];

const MAX_MESSAGE_LENGTH = 1000;

interface ContactOrganizerModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
}

/**
 * "Contact the organizer about ___" — a topic picker plus a free-text message.
 * The message goes to the organizer's in-app inbox; neither side's email
 * address is revealed to the other, which is why this posts to our own route
 * rather than opening a mailto: link.
 */
export default function ContactOrganizerModal({
  visible,
  onClose,
  eventId,
  eventTitle,
}: ContactOrganizerModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  const [topic, setTopic] = useState<Topic>('event');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // Reopening after a send should present a blank form, not the old success
  // state or a stale error from last time.
  useEffect(() => {
    if (visible) {
      setTopic('event');
      setMessage('');
      setError('');
      setSent(false);
      setLoading(false);
    }
  }, [visible]);

  const canSend = message.trim().length > 0 && !loading;

  const handleSend = async () => {
    if (!canSend) return;
    setLoading(true);
    setError('');
    try {
      await backendJson('/api/events/contact-organizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, topic, message: message.trim() }),
      });
      setSent(true);
    } catch (e: any) {
      setError(e?.message || t('contactOrganizer.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {sent ? t('contactOrganizer.sentTitle') : t('contactOrganizer.title')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {sent ? (
              <View style={styles.sentBody}>
                <Text style={styles.sentText}>
                  {eventTitle
                    ? t('contactOrganizer.sentBodyNamed').replace('{event}', eventTitle)
                    : t('contactOrganizer.sentBody')}
                </Text>
                <TouchableOpacity style={styles.submit} onPress={onClose}>
                  <Text style={styles.submitText}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {TOPICS.map((key) => {
                  const selected = topic === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.topicRow}
                      onPress={() => setTopic(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text style={styles.topicLabel}>
                        {t(`contactOrganizer.topics.${key}`)}
                      </Text>
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? <Check size={13} color={colors.background} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={(v) => setMessage(v.slice(0, MAX_MESSAGE_LENGTH))}
                  placeholder={t('contactOrganizer.messagePlaceholder')}
                  placeholderTextColor={colors.textTertiary || colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                  maxLength={MAX_MESSAGE_LENGTH}
                  editable={!loading}
                />
                <Text style={styles.counter}>
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.submit, !canSend && styles.submitDisabled]}
                  onPress={handleSend}
                  disabled={!canSend}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.submitText}>{t('contactOrganizer.send')}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
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
    sheetWrap: {
      width: '100%',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      maxHeight: '86%',
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
      alignItems: 'flex-start',
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
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    topicLabel: {
      fontSize: 16,
      color: colors.text,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    input: {
      marginTop: spacing.md,
      minHeight: 120,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      padding: spacing.lg,
      fontSize: 15,
      color: colors.text,
    },
    counter: {
      alignSelf: 'flex-end',
      marginTop: spacing.xs,
      fontSize: 12,
      color: colors.textSecondary,
    },
    error: {
      marginTop: spacing.md,
      fontSize: 14,
      color: colors.error,
    },
    submit: {
      marginTop: spacing.xl,
      height: 56,
      borderRadius: radius.button,
      backgroundColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: {
      opacity: 0.4,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.background,
    },
    sentBody: {
      paddingBottom: spacing.md,
    },
    sentText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
  });
