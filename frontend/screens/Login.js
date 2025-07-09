import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function Login({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

 const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please fill in both fields');
    return;
  }

  setLoading(true);

  try {
    console.log('Logging in to Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ Firebase login success:", user.email);

    Alert.alert("Success", `Welcome ${user.email}`);

    if (onLoginSuccess) {
      onLoginSuccess(user);
    }
  } catch (error) {
    console.error("❌ Firebase login failed:", error);
    Alert.alert('Login failed', error.message || 'Try again');
  } finally {
    setLoading(false);
  }
};


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.formWrapper}>
        <Text style={styles.title}>Welcome Back</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
  <Text style={[styles.switchText, { marginTop: 10 }]}>Forgot Password?</Text>
</TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.switchText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#9C27B0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 14,
  },
});
