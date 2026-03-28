import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';

export default function SignupScreen({ navigation }: any) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
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

  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const logoOpacity = logoAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] });

  return (
    <LinearGradient colors={['#0F172A', '#1a0533', '#0F766E']} style={styles.gradient}>
      <View style={[styles.blob, { top: -60, left: -80, backgroundColor: '#7C3AED' }]} />
      <View style={[styles.blob, { bottom: 80, right: -60, backgroundColor: '#0D9488', opacity: 0.35 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
              <Image
                source={require('../../assets/eventica_logo_primary.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Eventica</Text>
              <Text style={styles.subtitle}>{t('auth.signup.title')}</Text>
            </Animated.View>

            <Animated.View style={{ transform: [{ translateY: formAnim }], opacity: formOpacity }}>
              <BlurView intensity={60} tint="dark" style={styles.blurCard}>
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.placeholders.fullName')}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={fullName}
                    onChangeText={setFullName}
                    selectionColor="#14B8A6"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.placeholders.email')}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    selectionColor="#14B8A6"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.placeholders.password')}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    selectionColor="#14B8A6"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.placeholders.confirmPassword')}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    selectionColor="#14B8A6"
                  />

                  <TouchableOpacity
                    onPress={handleSignup}
                    disabled={loading}
                    style={loading ? styles.buttonDisabled : undefined}
                  >
                    <LinearGradient
                      colors={['#14B8A6', '#0D9488']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? t('auth.signup.creatingAccount') : t('auth.signup.signUp')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>
                      {t('auth.signup.haveAccount')}{' '}
                      <Text style={styles.linkTextBold}>{t('auth.signup.signIn')}</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.22,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 60,
    height: 60,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  blurCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  form: {
    padding: 24,
    gap: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  button: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  linkButton: {
    marginTop: 4,
  },
  linkText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#5EEAD4',
    fontWeight: '700',
  },
});
