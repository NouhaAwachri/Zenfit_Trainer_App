import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function HomeScreen({ navigation, user }) {
  const username = user?.displayName || user?.email || 'User'; 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/home.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* ☰ Drawer menu button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.openDrawer()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>

          {/* 👤 Username */}
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={24} color="#fff" />
            <Text style={styles.usernameText} numberOfLines={1} ellipsizeMode="tail">
              Hello, {username}
            </Text>
          </View>

          {/* Main Content */}
          <ScrollView
            contentContainerStyle={styles.contentWrapper}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>AI Personal Trainer</Text>
            <Text style={styles.subtitle}>Smarter Fitness. Real Results.</Text>

             <TouchableOpacity
                style={[styles.button, { backgroundColor: '#00796B' }]}  // Teal green
                onPress={() => navigation.navigate('GenProgram')}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>💬 Generate Workout Program</Text>
              </TouchableOpacity>


            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Chatbot')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>💬 Chat with Coach</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Dashboard')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>📊 View Progress</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.button, { marginTop: 30, backgroundColor: '#E53935' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>🚪 Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: width * 0.06,
    paddingTop: 40,
  },

  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    left: 20,
    zIndex: 10,
  },

  userInfo: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    maxWidth: width * 0.4,
  },

  usernameText: {
    color: '#fff',
    fontSize: scale(0.04, 16),
    marginLeft: 5,
    fontWeight: '600',
  },

  contentWrapper: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  title: {
    fontSize: scale(0.09, 36),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: scale(0.05, 22),
    color: '#eee',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  button: {
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: width * 0.7,
    maxWidth: 300,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 2,
  },

  buttonText: {
    color: '#fff',
    fontSize: scale(0.038, 15),
    fontWeight: 'bold',
  },
});