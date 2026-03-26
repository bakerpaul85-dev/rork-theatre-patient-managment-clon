import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { findRadiographerByEmail } from '@/constants/radiographers';
import { Mail, CheckCircle, ArrowLeft, KeyRound, UserPlus } from 'lucide-react-native';

type ScreenMode = 'login' | 'signup' | 'reset';

export default function LoginScreen() {
  const [mode, setMode] = useState<ScreenMode>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login, signUp, resetPassword } = useAuth();
  const router = useRouter();

  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  const matchedRadiographer = useMemo(() => {
    if (!email.trim()) return null;
    return findRadiographerByEmail(email) ?? null;
  }, [email]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const radiographer = findRadiographerByEmail(email);
    if (!radiographer) {
      Alert.alert('Email Not Found', 'This email is not registered in our system.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email, password);
      if (result === 'success') {
        Alert.alert(
          'Password Reset',
          'Your password has been reset successfully. Please sign in with your new password.',
          [{ text: 'OK', onPress: () => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
          }}]
        );
      } else {
        Alert.alert('Error', 'No account found for this email. Please sign up first.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (matchedRadiographer && matchedRadiographer.status === 'Inactive') {
      Alert.alert('Account Inactive', 'This radiographer account is currently inactive. Please contact administration.');
      return;
    }

    if (!matchedRadiographer) {
      if (!customName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      if (!customPrefix.trim()) {
        Alert.alert('Error', 'Please enter a prefix code');
        return;
      }
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const prefixUsername = matchedRadiographer ? matchedRadiographer.prefix : customPrefix.trim().toUpperCase();
      const userName = matchedRadiographer ? matchedRadiographer.name : customName.trim();
      const success = await signUp(prefixUsername, password, userName, email);
      if (success) {
        Alert.alert(
          'Success',
          `Account created!\n\nName: ${userName}\nPrefix: ${prefixUsername}\nEmail: ${email.toLowerCase()}`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert('Error', 'This email or prefix is already registered. Please sign in instead.');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'An error occurred during sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-16%20at%2015.22.50-JyB1hDLPIW4YW19VGV6OPbJHt1Uo3V.png' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Theatre Patient Management</Text>
                <Text style={styles.subtitle}>
                  {isReset ? 'Reset Your Password' : 'Patient Registration System'}
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {isSignUp ? 'Email Address' : 'Email Address'}
                  </Text>
                  <View style={styles.emailInputWrapper}>
                    <Mail size={18} color="#999" style={styles.emailIcon} />
                    <TextInput
                      style={styles.emailInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="email-input"
                    />
                  </View>
                </View>

                {isSignUp && email.trim().length > 0 && (
                  <View style={[
                    styles.matchBadge,
                    matchedRadiographer ? styles.matchBadgeSuccess : styles.matchBadgeNew
                  ]}>
                    {matchedRadiographer ? (
                      <>
                        <CheckCircle size={18} color="#28A745" />
                        <View style={styles.matchInfo}>
                          <Text style={styles.matchName}>{matchedRadiographer.name}</Text>
                          <Text style={styles.matchPrefix}>Prefix: {matchedRadiographer.prefix}</Text>
                          <Text style={styles.matchStatus}>
                            Status: {matchedRadiographer.status}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} color="#0066CC" />
                        <Text style={styles.matchNewText}>
                          New user — please fill in your details below
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {isSignUp && email.trim().length > 0 && !matchedRadiographer && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Full Name</Text>
                      <TextInput
                        style={styles.input}
                        value={customName}
                        onChangeText={setCustomName}
                        placeholder="Enter your full name"
                        autoCapitalize="words"
                        autoCorrect={false}
                        editable={!isLoading}
                        testID="custom-name-input"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Prefix Code</Text>
                      <TextInput
                        style={styles.input}
                        value={customPrefix}
                        onChangeText={setCustomPrefix}
                        placeholder="Enter your prefix code (e.g. SMI)"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isLoading}
                        testID="custom-prefix-input"
                      />
                    </View>
                  </>
                )}

                {!isReset && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="password-input"
                    />
                  </View>
                )}

                {isSignUp && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm your password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="confirm-password-input"
                    />
                  </View>
                )}



                {(isReset) && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter new password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="new-password-input"
                    />
                  </View>
                )}

                {isReset && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="confirm-new-password-input"
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={isReset ? handleResetPassword : (isSignUp ? handleSignUp : handleLogin)}
                  disabled={isLoading}
                  testID="submit-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {isReset ? 'Reset Password' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </Text>
                  )}
                </TouchableOpacity>

                {!isReset && (
                  <TouchableOpacity
                    style={styles.forgotButton}
                    onPress={() => {
                      setMode('reset');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={isLoading}
                  >
                    <KeyRound size={14} color="#999" />
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                {isReset ? (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setMode('login');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={isLoading}
                  >
                    <ArrowLeft size={16} color="#0066CC" />
                    <Text style={styles.switchLink}>Back to Sign In</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchText}>
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setMode(isSignUp ? 'login' : 'signup');
                        setEmail('');
                        setPassword('');
                        setConfirmPassword('');
                        setCustomName('');
                        setCustomPrefix('');
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.switchLink}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333333',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333333',
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  emailIcon: {
    marginRight: 4,
  },
  emailInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333333',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  matchBadgeSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  matchBadgeError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
  },
  matchBadgeNew: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  matchNewText: {
    fontSize: 14,
    color: '#0066CC',
    flex: 1,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#2E7D32',
  },
  matchPrefix: {
    fontSize: 13,
    color: '#388E3C',
    marginTop: 2,
  },
  matchStatus: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  matchErrorText: {
    fontSize: 14,
    color: '#DC3545',
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  switchText: {
    fontSize: 14,
    color: '#6C757D',
  },
  switchLink: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600' as const,
  },
  forgotButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    color: '#999',
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 12,
  },
});
