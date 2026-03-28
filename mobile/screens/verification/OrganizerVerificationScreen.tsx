import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  getVerificationRequest,
  initializeVerificationRequest,
  submitVerificationForReview,
  type VerificationRequest,
} from '../../lib/verification';

const SUBMITTED_STATUSES = ['pending', 'pending_review', 'in_review', 'approved'] as const;
const LOCKED_STATUSES = ['pending', 'pending_review', 'in_review'] as const;

export default function OrganizerVerificationScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    loadVerificationRequest();
  }, [userProfile?.id]);

  const loadVerificationRequest = async () => {
    if (!userProfile?.id) return;

    try {
      let verificationRequest = await getVerificationRequest(userProfile.id);

      // Initialize if doesn't exist
      if (!verificationRequest) {
        verificationRequest = await initializeVerificationRequest(userProfile.id);
      }

      setRequest(verificationRequest);

      // Redirect if already approved
      if (verificationRequest.status === 'approved') {
        Alert.alert(
          t('verification.organizerVerification.alerts.alreadyVerifiedTitle'),
          t('verification.organizerVerification.alerts.alreadyVerifiedBody'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
        return;
      }
    } catch (error) {
      console.error('Error loading verification:', error);
      Alert.alert(t('common.error'), t('verification.organizerVerification.alerts.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepId: keyof VerificationRequest['steps']) => {
    if (!request) return 'incomplete';
    return request.steps[stepId].status;
  };

  const isStepComplete = (stepId: keyof VerificationRequest['steps']) => {
    return getStepStatus(stepId) === 'complete';
  };

  const calculateProgress = () => {
    if (!request) return 0;
    const steps = Object.values(request.steps).filter((s: any) => s.required);
    const completed = steps.filter((s: any) => s.status === 'complete').length;
    return Math.round((completed / steps.length) * 100);
  };

  const canSubmit = () => {
    if (!request) return false;
    if ((LOCKED_STATUSES as readonly string[]).includes(request.status)) return false;
    const requiredSteps = Object.values(request.steps).filter((s: any) => s.required);
    return requiredSteps.every((s: any) => s.status === 'complete');
  };

  const isLocked = request ? (LOCKED_STATUSES as readonly string[]).includes(request.status) : false;
  const isRejected = request?.status === 'rejected' || request?.status === 'changes_requested';

  const renderStepIcon = (stepId: keyof VerificationRequest['steps']) => {
    const status = getStepStatus(stepId);
    if (status === 'complete') {
      return <Ionicons name="checkmark-circle" size={24} color={colors.success} />;
    } else if (status === 'needs_attention') {
      return <Ionicons name="alert-circle" size={24} color={colors.warning} />;
    }
    return <Ionicons name="ellipse-outline" size={24} color={colors.textSecondary} />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('verification.organizerVerification.loading')}</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>{t('verification.organizerVerification.alerts.failedToLoad')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVerificationRequest}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <ScrollView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? colors.surface : colors.white} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('verification.organizerVerification.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>{t('verification.organizerVerification.progressTitle')}</Text>
            <Text style={styles.statusPercentage}>{calculateProgress()}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${calculateProgress()}%` }]}
            />
          </View>
          {isLocked && (
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={styles.statusBadgeText}>{t('verification.organizerVerification.status.underReview')}</Text>
            </View>
          )}
          {request.status === 'approved' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                {t('verification.organizerVerification.status.approved')}
              </Text>
            </View>
          )}
          {isRejected && (
            <View style={[styles.statusBadge, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={[styles.statusBadgeText, { color: colors.error }]}>
                {request.status === 'changes_requested'
                  ? t('verification.organizerVerification.status.changesRequested')
                  : t('verification.organizerVerification.status.rejected')}
              </Text>
            </View>
          )}
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('verification.organizerVerification.stepsTitle')}</Text>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('OrganizerInfoForm', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('organizerInfo')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('verification.organizerVerification.steps.organizerInfo.title')}</Text>
              <Text style={styles.stepDescription}>
                {t('verification.organizerVerification.steps.organizerInfo.description')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('GovernmentIDUpload', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('governmentId')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('verification.organizerVerification.steps.governmentId.title')}</Text>
              <Text style={styles.stepDescription}>
                {t('verification.organizerVerification.steps.governmentId.description')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('SelfieUpload', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('selfie')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('verification.organizerVerification.steps.selfie.title')}</Text>
              <Text style={styles.stepDescription}>
                {t('verification.organizerVerification.steps.selfie.description')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        {isRejected && request.reviewNotes ? (
          <View style={[styles.pendingNotice, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.pendingText, { color: colors.error, fontWeight: '600' }]}>
                {t('verification.organizerVerification.status.reviewNotes')}
              </Text>
              <Text style={[styles.pendingText, { color: colors.error, marginTop: 4 }]}>
                {request.reviewNotes}
              </Text>
            </View>
          </View>
        ) : null}

        {canSubmit() && !isLocked && (
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={async () => {
                Alert.alert(
                  t('verification.organizerVerification.submit.confirmTitle'),
                  t('verification.organizerVerification.submit.confirmBody'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('verification.organizerVerification.submit.confirmButton'),
                      onPress: async () => {
                        try {
                          if (!userProfile?.id) return;
                          await submitVerificationForReview(userProfile.id);
                          Alert.alert(
                            t('common.success'),
                            t('verification.organizerVerification.submit.successBody'),
                            [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
                          );
                        } catch (error) {
                          console.error('Error submitting:', error);
                          Alert.alert(t('common.error'), t('verification.organizerVerification.submit.failed'));
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.submitButtonText}>{t('verification.organizerVerification.submit.button')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLocked && (
          <View style={styles.pendingNotice}>
            <Ionicons name="time-outline" size={24} color={colors.warning} />
            <Text style={styles.pendingText}>
              {t('verification.organizerVerification.pendingNotice')}
            </Text>
          </View>
        )}
      </ScrollView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statusPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  statusBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
  },
  statusBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIcon: {
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingNotice: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: colors.warning,
  },
});
