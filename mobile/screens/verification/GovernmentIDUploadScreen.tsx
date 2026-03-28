import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
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

type RouteParams = {
  GovernmentIDUpload: {
    onComplete?: () => void;
  };
};

export default function GovernmentIDUploadScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'GovernmentIDUpload'>>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
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

      // Update Firestore
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          front: storagePath,
          back: backPath || undefined,
          uploadedAt: new Date(),
        },
      });

      Alert.alert(t('common.success'), t('verification.governmentId.alerts.frontUploaded'));
    } catch (error: any) {
      console.error('[ID Front Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        Alert.alert(t('verification.common.uploadErrorTitle'), errorMsg);
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

      // Update Firestore
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          front: frontPath || undefined,
          back: storagePath,
          uploadedAt: new Date(),
        },
      });

      Alert.alert(t('common.success'), t('verification.governmentId.alerts.backUploaded'));
    } catch (error: any) {
      console.error('[ID Back Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        Alert.alert(t('verification.common.uploadErrorTitle'), errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const showUploadOptions = (side: 'front' | 'back') => {
    const sideLabel = side === 'front' ? t('verification.governmentId.sides.front') : t('verification.governmentId.sides.back');
    Alert.alert(
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
      Alert.alert(t('verification.governmentId.validation.missingTitle'), t('verification.governmentId.validation.missingBody'));
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

      Alert.alert(t('common.success'), t('verification.governmentId.alerts.uploadedSuccessfully'), [
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
      Alert.alert(t('common.error'), t('verification.common.saveStepFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verification.governmentId.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
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
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    flex: 1,
    padding: 16,
  },
  instructionsCard: {
    padding: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  tipsList: {
    alignSelf: 'stretch',
  },
  tipItem: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
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
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
