import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  Animated, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const waterLevel = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance Animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      // Logo "Filling Up" animation
      Animated.timing(waterLevel, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ]).start();

    // Floating bubbles animation loop
    Animated.loop(
      Animated.timing(bubbleAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Interpolate water height for the logo
  const liquidHeight = waterLevel.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '70%'],
  });

  return (
    <View style={styles.container}>
      {/* Background Bubbles */}
      {[...Array(6)].map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bubble,
            {
              left: (width / 6) * i + 20,
              opacity: bubbleAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.3, 0],
              }),
              transform: [{
                translateY: bubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height, -100],
                })
              }]
            }
          ]}
        />
      ))}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['#075985', '#0047AB', '#f0f9ff']}
          style={styles.headerBackground}
        >
          <SafeAreaView style={styles.headerContent}>
            {/* Logo Image */}
            <View style={styles.logoOuter}>
               <Image source={require('../assets/nehmat.png')} style={styles.logoImage} />
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Nehmat Water Supply</Text>
              <Text style={styles.headerSubtitle}>Nehmat Water Supply System</Text>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.welcomeSubtext}>Sign in to access your dashboard</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#0ea5e9" style={styles.inputIcon} />
                <TextInput
                  placeholder="name@company.com"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#0ea5e9" style={styles.inputIcon} />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!isPasswordVisible)}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0047AB', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" style={{ marginLeft: 5 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* <TouchableOpacity style={styles.footer}>
              <Text style={styles.footerText}>Need help accessing your account?</Text>
            </TouchableOpacity> */}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  bubble: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    zIndex: 0,
  },
  headerBackground: {
    height: height * 0.45,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOuter: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 10,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 40,
  },
  dropShape: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 40,
    borderTopLeftRadius: 0,
    transform: [{ rotate: '-45deg' }], // Standard teardrop rotation
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  liquid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#38bdf8',
  },
  fill: { flex: 1 },
  logoIcon: {
    transform: [{ rotate: '45deg' }], // Counter-rotate icon back to upright
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  formContainer: {
    flex: 1,
    marginTop: -50,
    paddingHorizontal: 25,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 18,
    height: 58,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#1e293b', fontSize: 16 },
  loginButton: {
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginGradient: {
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#e11d48',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#0ea5e9',
    fontWeight: '600',
    fontSize: 14,
  },
});