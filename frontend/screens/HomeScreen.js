import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function Welcome({ navigation }) {
  const [activeBtn, setActiveBtn] = useState('');

  const handleNav = (target) => {
    setActiveBtn(target);
    navigation.navigate(target);
  };

  const features = [
    {
      icon: 'barbell',
      title: 'Personalized Programs',
      description: 'Tailored workouts based on your goals and fitness level',
    },
    {
      icon: 'trending-up',
      title: 'Smart Adaptation',
      description: 'AI adapts to your recovery and fatigue patterns',
    },
    {
      icon: 'analytics',
      title: 'Progress Tracking',
      description: 'Detailed insights into your fitness journey',
    },
    {
      icon: 'chatbubbles',
      title: 'AI Coach Chat',
      description: '24/7 support from your intelligent fitness assistant',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/greyfront.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Header with Navigation */}
          <View style={styles.header}>
            <View style={styles.navbar}>
              <TouchableOpacity
                style={[styles.navButton, activeBtn === 'Login' && styles.navButtonActive]}
                onPress={() => handleNav('Login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.navButtonText, activeBtn === 'Login' && styles.navButtonTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, activeBtn === 'Signup' && styles.navButtonActive]}
                onPress={() => handleNav('Signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.navButtonText, activeBtn === 'Signup' && styles.navButtonTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView
            contentContainerStyle={styles.contentWrapper}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.titleSection}>
              <View style={styles.brandContainer}>
                <Ionicons name="fitness" size={48} color="#9C27B0" />
                <Text style={styles.title}>Zenfit</Text>
              </View>
              <Text style={styles.subtitle}>AI Personal Trainer</Text>
              <Text style={styles.tagline}>
                Transform your fitness journey with intelligent coaching
              </Text>
            </View>

            {/* Features Section */}
            <Text style={styles.featuresTitle}>Why Choose Zenfit?</Text>

            <View style={styles.cardsContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={feature.icon} size={24} color="#9C27B0" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>

            {/* Call-to-Action Section */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setActiveBtn('');
                  navigation.navigate('Signup');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.primaryText}>Start Your Journey</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleNav('Login')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryText}>Already have an account?</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },

  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15,
    paddingBottom: 10,
  },

  navbar: {
    flexDirection: 'row',
  },

  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 12,
  },

  navButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },

  navButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: scale(0.035, 14),
  },

  navButtonTextActive: {
    color: '#fff',
  },

  contentWrapper: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  title: {
    fontSize: scale(0.08, 32),
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  subtitle: {
    fontSize: scale(0.05, 20),
    color: '#9C27B0',
    fontWeight: '600',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  tagline: {
    fontSize: scale(0.04, 16),
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  featuresTitle: {
    fontSize: scale(0.055, 22),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  cardsContainer: {
    marginBottom: 30,
  },

  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  featureTitle: {
    fontSize: scale(0.042, 17),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  featureDescription: {
    fontSize: scale(0.035, 14),
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 18,
  },

  ctaSection: {
    alignItems: 'center',
    paddingTop: 15,
  },

  primaryButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: '80%',
    maxWidth: 320,
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  primaryText: {
    color: '#fff',
    fontSize: scale(0.045, 18),
    fontWeight: 'bold',
    marginLeft: 8,
  },

  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  secondaryText: {
    color: '#E0E0E0',
    fontSize: scale(0.038, 15),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});