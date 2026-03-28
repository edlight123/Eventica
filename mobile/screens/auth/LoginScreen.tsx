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
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND } from '../../config/brand';
import { useI18n } from '../../contexts/I18nContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
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

  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const logoOpacity = logoAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] });

  return (
    <LinearGradient colors={['#0F172A', '#134E4A', '#0F766E']} style={styles.gradient}>
      {/* Decorative blurred circles */}
      <View style={[styles.blob, { top: -80, right: -60, backgroundColor: '#14B8A6' }]} />
      <View style={[styles.blob, { bottom: 100, left: -80, backgroundColor: '#0D9488', opacity: 0.4 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <Image
              source={require('../../assets/eventica_logo_primary.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Eventica</Text>
            <Text style={styles.tagline}>{BRAND.tagline}</Text>
          </Animated.View>

          {/* Frosted form card */}
          <Animated.View style={{ transform: [{ translateY: formAnim }], opacity: formOpacity }}>
            <BlurView intensity={60} tint="dark" style={styles.blurCard}>
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.placeholders.email')}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor="#14B8A6"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.placeholders.password')}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  selectionColor="#14B8A6"
                />

                <TouchableOpacity
                  onPress={handleLogin}
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
                      {loading ? t('auth.login.signingIn') : t('auth.login.signIn')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, loading && styles.buttonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Text style={styles.googleButtonText}>
                    {t('auth.login.continueWithGoogle')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.linkText}>
                    {t('auth.login.noAccount')}{' '}
                    <Text style={styles.linkTextBold}>{t('auth.login.signUp')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </View>
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
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.25,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    marginHorizontal: 14,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
