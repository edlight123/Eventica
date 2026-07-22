import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { AuthBackground } from '../../components/auth/AuthBackground';
import { AuthHeadline } from '../../components/auth/AuthHeadline';
import { AuthInput } from '../../components/auth/AuthInput';
import WhitePillCTA from '../../components/WhitePillCTA';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing } from '../../theme/tokens';

export default function SignupScreen({ navigation }: any) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithApple, appleAuthAvailable } = useAuth();

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in with Apple', error?.message || 'Could not sign in with Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Entrance animations — headline settles first, then the form cluster rises.
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headlineAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.signup.errors.fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.signup.errors.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.signup.errors.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
    } catch (error: any) {
      Alert.alert(t('auth.signup.errors.signupFailedTitle'), error.message || t('auth.signup.errors.couldNotCreateAccount'));
    } finally {
      setLoading(false);
    }
  };

  const headlineOpacity = headlineAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 1] });
  const headlineTranslate = headlineAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top — brand + oversized editorial headline, left-aligned */}
          <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineTranslate }] }}>
            <AuthHeadline
              eyebrow={t('auth.signup.eyebrow')}
              lead={t('auth.signup.headlineLead')}
              accent={t('auth.signup.headlineAccent')}
            />
          </Animated.View>

          {/* Spacer keeps the form in the lower band without over-stretching */}
          <View style={styles.spacer} />

          {/* Lower cluster — form + auth buttons grouped tight, left-aligned */}
          <Animated.View style={{ transform: [{ translateY: formAnim }], opacity: formOpacity }}>
            <View style={styles.form}>
              <AuthInput
                icon={User}
                placeholder={t('auth.signup.placeholders.fullName')}
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
              />
              <AuthInput
                icon={Mail}
                placeholder={t('auth.signup.placeholders.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              <AuthInput
                icon={Lock}
                isPassword
                placeholder={t('auth.signup.placeholders.password')}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <AuthInput
                icon={Lock}
                isPassword
                placeholder={t('auth.signup.placeholders.confirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />

              {/* Primary action — the one white pill per screen (POSH §2.2) */}
              <WhitePillCTA
                label={loading ? t('auth.signup.creatingAccount') : t('auth.signup.signUp')}
                onPress={handleSignup}
                loading={loading}
                style={styles.primary}
              />

              {/* Sign up with Apple — native HIG button; iOS + native module only. */}
              {appleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={28}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              <View style={styles.linkButton}>
                <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>
                  {t('auth.signup.haveAccount')}{' '}
                  <Text style={styles.linkTextBold}>{t('auth.signup.signIn')}</Text>
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxl,
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
});
