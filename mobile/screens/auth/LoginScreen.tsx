import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { AuthBackground } from '../../components/auth/AuthBackground';
import { AuthHeadline } from '../../components/auth/AuthHeadline';
import { AuthInput } from '../../components/auth/AuthInput';
import { SecondaryPill } from '../../components/auth/SecondaryPill';
import * as AppleAuthentication from 'expo-apple-authentication';
import WhitePillCTA from '../../components/WhitePillCTA';
import { colors, spacing, type } from '../../theme/tokens';

export default function LoginScreen({ navigation }: any) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple, appleAuthAvailable } = useAuth();

  // Entrance animations — headline settles first, then the form cluster rises.
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headlineAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.login.errors.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert(t('auth.login.errors.loginFailedTitle'), error.message || t('auth.login.errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('auth.login.google.title'), error.message || t('auth.login.google.configRequired'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      // User-cancelled (ERR_REQUEST_CANCELED) is not an error worth alerting.
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in with Apple', error?.message || 'Could not sign in with Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  const headlineOpacity = headlineAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 1] });
  const headlineTranslate = headlineAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
          {/* Top third — brand + oversized editorial headline, left-aligned */}
          <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineTranslate }] }}>
            <AuthHeadline
              eyebrow={t('auth.login.eyebrow')}
              lead={t('auth.login.headlineLead')}
              accent={t('auth.login.headlineAccent')}
            />
          </Animated.View>

          {/* Spacer pushes the form cluster into the lower ~55% of the screen */}
          <View style={styles.spacer} />

          {/* Lower cluster — form + auth buttons grouped tight, left-aligned */}
          <Animated.View style={{ transform: [{ translateY: formAnim }], opacity: formOpacity }}>
            <View style={styles.form}>
              <AuthInput
                icon={Mail}
                placeholder={t('auth.login.placeholders.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              <AuthInput
                icon={Lock}
                isPassword
                placeholder={t('auth.login.placeholders.password')}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />

              {/* Primary action — the one white pill per screen (POSH §2.2) */}
              <WhitePillCTA
                label={loading ? t('auth.login.signingIn') : t('auth.login.signIn')}
                onPress={handleLogin}
                loading={loading}
                style={styles.primary}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Secondary action — dark-grey pill, never teal */}
              <SecondaryPill
                label={t('auth.login.continueWithGoogle')}
                onPress={handleGoogleSignIn}
                disabled={loading}
              />

              {/* Sign in with Apple — Apple's HIG-compliant native button.
                  Only renders on iOS with the native module present. */}
              {appleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={28}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              <View style={styles.linkButton}>
                <Text style={styles.linkText} onPress={() => navigation.navigate('Signup')}>
                  {t('auth.login.noAccount')}{' '}
                  <Text style={styles.linkTextBold}>{t('auth.login.signUp')}</Text>
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  primary: {
    marginTop: spacing.xs,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  linkButton: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  linkText: {
    textAlign: 'left',
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkTextBold: {
    color: colors.tealBright,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    ...type.caption,
    marginHorizontal: 14,
    color: colors.textTertiary,
  },
});
