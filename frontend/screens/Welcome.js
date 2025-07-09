import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function Welcome({ navigation }) {
  const [activeBtn, setActiveBtn] = useState('');

  const handleNav = (target) => {
    setActiveBtn(target);
    navigation.navigate(target);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/greyfront.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Navbar */}
          <View style={styles.navbarWrapper}>
            <View style={styles.navbar}>
              <TouchableOpacity
                onPress={() => handleNav('Login')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.navButton,
                    activeBtn === 'Login' && styles.navButtonActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleNav('Signup')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.navButton,
                    activeBtn === 'Signup' && styles.navButtonActive,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView contentContainerStyle={styles.contentWrapper}>
            <Text style={styles.title}>Zenfit</Text>
            <Text style={styles.subtitle}> AI Personal Trainer</Text>

            <View style={styles.featuresBox}>
              <Text style={styles.feature}>🏋️ Personalized programs based on your goals</Text>
              <Text style={styles.feature}>🧠 Adapts to recovery & fatigue</Text>
              <Text style={styles.feature}>📊 Tracks your progress</Text>
              <Text style={styles.feature}>💬 Chat with your AI coach</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setActiveBtn('');
                navigation.navigate('Signup');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>🚀 Start Your Journey</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: width * 0.06,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 40,
  },

  navbarWrapper: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },

  navbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  navButton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scale(0.04, 16),
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9C27B0',
  },

  navButtonActive: {
    backgroundColor: '#9C27B0',
    color: '#fff',
  },

  contentWrapper: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  title: {
    fontSize: scale(0.09, 36),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: scale(0.05, 22),
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
  },

  featuresBox: {
    marginBottom: 36,
    maxWidth: 500,
    paddingHorizontal: 10,
  },

  feature: {
    fontSize: scale(0.04, 16),
    color: '#ddd',
    marginBottom: 10,
    textAlign: 'center',
  },

  primaryButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: width * 0.7,
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  primaryText: {
    color: '#fff',
    fontSize: scale(0.045, 18),
    fontWeight: 'bold',
  },
});
