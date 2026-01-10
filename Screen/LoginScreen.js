import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // Built into Expo

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const handleLogin = () => {
    // In a real app, you'd validate credentials here.
    // For now, we navigate directly to the Admin Dashboard.
    navigation.navigate('AdminDashboard');
  };
  return (
    <View style={styles.container}>
      {/* Blue Background Section */}
      <LinearGradient
        colors={['#0047AB', '#002D62']}
        style={styles.headerBackground}
      >
        <SafeAreaView style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Ionicons name="infinite" size={40} color="white" />
          </View>
          <Text style={styles.headerTitle}>Login Account</Text>
          <Text style={styles.headerSubtitle}>
            Please enter your credentials to access your account and detail
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {/* White Card Section */}
      <View style={styles.formContainer}>
        {/* Email Input */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="at-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            placeholder="Enter your email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Input */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            placeholder="Enter your password"
            secureTextEntry={!isPasswordVisible}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)}>
            <Ionicons 
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} 
              size={20} color="#999" 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or login with</Text>
          <View style={styles.line} />
        </View>

        {/* Google Button */}
        <TouchableOpacity style={styles.googleButton}>
          <Ionicons name="logo-google" size={20} color="red" style={{ marginRight: 10 }} />
          <Text style={styles.googleButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: { height: '40%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  logoContainer: { alignItems: 'center' },
  logoBox: { backgroundColor: '#3498db', padding: 15, borderRadius: 20, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 14 },
  
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  label: { fontWeight: '600', marginBottom: 8, color: '#333' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%' },
  forgotText: { textAlign: 'right', color: '#3498db', fontWeight: '600', marginBottom: 30 },
  
  loginButton: {
    backgroundColor: '#3498db',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: '#888' },
  
  googleButton: {
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    backgroundColor: '#F3F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  googleButtonText: { color: '#333', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  signUpText: { color: '#3498db', fontWeight: 'bold' }
});