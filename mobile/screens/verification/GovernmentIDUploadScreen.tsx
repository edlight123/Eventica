import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  pickAndUploadImage,
  updateVerificationFiles,
  updateVerificationStep,
  getDocumentDownloadURL,
  getVerificationRequest,
} from '../../lib/verification';
import { useAppAlert } from '../../components/AppAlert';
import OverlayHeader, { useOverlayHeaderInset } from '../../components/OverlayHeader';
import { radius } from '../../theme/tokens';

type RouteParams = {
  GovernmentIDUpload: {
    onComplete?: () => void;
  };
};

export default function GovernmentIDUploadScreen() {
  const { colors, isDark } = useTheme();
  const showAlert = useAppAlert();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'GovernmentIDUpload'>>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // The header floats over the scroll view, so the content has to reserve its
  // measured height or the photo tips start life hidden behind it.
  const { height: headerH, onHeight } = useOverlayHeaderInset();
  const [frontPath, setFrontPath] = useState<string | null>(null);
  const [backPath, setBackPath] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExistingImages();
  }, [userProfile?.id]);

  const loadExistingImages = async () => {
    if (!userProfile?.id) return;

    try {
      const request = await getVerificationRequest(userProfile.id);
      if (request?.files?.governmentId) {
        const { front, back } = request.files.governmentId;
        
        if (front) {
          setFrontPath(front);
          const url = await getDocumentDownloadURL(front);
          setFrontPreview(url);
        }
        
        if (back) {
          setBackPath(back);
          const url = await getDocumentDownloadURL(back);
          setBackPreview(url);
        }
      }
    } catch (error) {
      console.error('Error loading existing images:', error);
    }
  };

  const handleUploadFront = async (useCamera: boolean) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);
      const storagePath = await pickAndUploadImage(userProfile.id, 'id_front', useCamera);
      setFrontPath(storagePath);

      // Get preview URL
      const url = await getDocumentDownloadURL(storagePath);
      setFrontPreview(url);

      // Update Firestore — never include an undefined side: Firestore's
      // updateDoc rejects `undefined` field values outright ("Unsupported
      // field value"), which used to kill the very first upload.
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          front: storagePath,
          ...(backPath ? { back: backPath } : {}),
          uploadedAt: new Date(),
        },
      });

      showAlert(t('common.success'), t('verification.governmentId.alerts.frontUploaded'));
    } catch (error: any) {
      console.error('[ID Front Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        showAlert(t('verification.common.uploadErrorTitle'), errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBack = async (useCamera: boolean) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);
      const storagePath = await pickAndUploadImage(userProfile.id, 'id_back', useCamera);
      setBackPath(storagePath);

      // Get preview URL
      const url = await getDocumentDownloadURL(storagePath);
      setBackPreview(url);

      // Same undefined-guard as the front upload.
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          ...(frontPath ? { front: frontPath } : {}),
          back: storagePath,
          uploadedAt: new Date(),
        },
      });

      showAlert(t('common.success'), t('verification.governmentId.alerts.backUploaded'));
    } catch (error: any) {
      console.error('[ID Back Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        showAlert(t('verification.common.uploadErrorTitle'), errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const showUploadOptions = (side: 'front' | 'back') => {
    const sideLabel = side === 'front' ? t('verification.governmentId.sides.front') : t('verification.governmentId.sides.back');
    showAlert(
      `${t('verification.governmentId.uploadTitlePrefix')} ${sideLabel}`,
      t('verification.common.chooseOption'),
      [
        {
          text: t('verification.common.takePhoto'),
          onPress: () => {
            if (side === 'front') {
              handleUploadFront(true);
            } else {
              handleUploadBack(true);
            }
          },
        },
        {
          text: t('verification.common.chooseFromLibrary'),
          onPress: () => {
            if (side === 'front') {
              handleUploadFront(false);
            } else {
              handleUploadBack(false);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleContinue = async () => {
    if (!frontPath || !backPath) {
      showAlert(t('verification.governmentId.validation.missingTitle'), t('verification.governmentId.validation.missingBody'));
      return;
    }

    if (!userProfile?.id) return;

    try {
      setSaving(true);

      // Mark step as complete
      await updateVerificationStep(userProfile.id, 'governmentId', {
        status: 'complete',
        missingFields: [],
      });

      showAlert(t('common.success'), t('verification.governmentId.alerts.uploadedSuccessfully'), [
        {
          text: t('common.ok'),
          onPress: () => {
            if (route.params?.onComplete) {
              route.params.onComplete();
            }
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      showAlert(t('common.error'), t('verification.common.saveStepFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? colors.surface : colors.white} />

      {/* Header */}
      <OverlayHeader onHeight={onHeight} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verification.governmentId.title')}</Text>
        <View style={{ width: 40 }} />
      </OverlayHeader>

      {/* Scrollable — with both previews loaded the content is taller than the
          viewport, and testers couldn't reach the ID Back section at all. */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingTop: headerH }]}
      >
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={32} color={colors.primary} />
          <Text style={styles.instructionsTitle}>{t('verification.governmentId.photoTipsTitle')}</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>✓ {t('verification.governmentId.tips.readable')}</Text>
            <Text style={styles.tipItem}>✓ {t('verification.governmentId.tips.lighting')}</Text>
            <Text style={styles.tipItem}>✓ {t('verification.governmentId.tips.background')}</Text>
            <Text style={styles.tipItem}>✓ {t('verification.governmentId.tips.notBlurry')}</Text>
          </View>
        </View>

        {/* Front Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>{t('verification.governmentId.labels.front')}</Text>
          {frontPreview ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: frontPreview }} style={styles.preview} />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => showUploadOptions('front')}
                disabled={uploading}
              >
                <Ionicons name="camera" size={20} color={colors.primary} />
                <Text style={styles.changeButtonText}>{t('verification.common.changePhoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => showUploadOptions('front')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
                  <Text style={styles.uploadButtonText}>{t('verification.governmentId.buttons.uploadFront')}</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    {t('verification.common.uploadHint')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Back Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>{t('verification.governmentId.labels.back')}</Text>
          {backPreview ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: backPreview }} style={styles.preview} />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => showUploadOptions('back')}
                disabled={uploading}
              >
                <Ionicons name="camera" size={20} color={colors.primary} />
                <Text style={styles.changeButtonText}>{t('verification.common.changePhoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => showUploadOptions('back')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
                  <Text style={styles.uploadButtonText}>{t('verification.governmentId.buttons.uploadBack')}</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    {t('verification.common.uploadHint')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!frontPath || !backPath || uploading || saving) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!frontPath || !backPath || uploading || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.continueButtonText}>{t('verification.common.saveAndContinue')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // OverlayHeader owns the layout, the safe-area padding and the blurred
  // backdrop; only the title-centering rule is ours.
  header: {
    justifyContent: 'space-between',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  instructionsCard: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  tipsList: {
    alignSelf: 'stretch',
  },
  tipItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
