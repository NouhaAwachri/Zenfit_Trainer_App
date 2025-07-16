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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);
const isSmallScreen = height < 700;

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/greyfront.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Navbar */}
            <View style={styles.navbarWrapper}>
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

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.brandContainer}>
                <Ionicons name="fitness" size={isSmallScreen ? 36 : 48} color="#9C27B0" />
                <Text style={styles.title}>Zenfit</Text>
              </View>
              <Text style={styles.subtitle}>AI Personal Trainer</Text>
              <Text style={styles.tagline}>
                Transform your fitness journey with intelligent coaching
              </Text>
            </View>

            {/* Features Section */}
            <Text style={styles.featuresTitle}>Why Choose Zenfit?</Text>

            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={feature.icon} size={isSmallScreen ? 22 : 28} color="#9C27B0" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: isSmallScreen ? 20 : 40,
    paddingBottom: isSmallScreen ? 20 : 40,
  },
  navbarWrapper: {
    alignItems: 'flex-end',
    marginBottom: isSmallScreen ? 10 : 20,
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
  heroSection: {
    alignItems: 'center',
    marginTop: isSmallScreen ? 10 : 20,
    marginBottom: isSmallScreen ? 20 : 30,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 4 : 8,
  },
  title: {
    fontSize: isSmallScreen ? scale(0.07, 28) : scale(0.08, 32),
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: isSmallScreen ? scale(0.045, 18) : scale(0.05, 20),
    color: '#9C27B0',
    fontWeight: '600',
    marginBottom: isSmallScreen ? 4 : 6,
  },
  tagline: {
    fontSize: isSmallScreen ? scale(0.035, 14) : scale(0.04, 16),
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 18 : 22,
    paddingHorizontal: 20,
  },
  featuresTitle: {
    fontSize: isSmallScreen ? scale(0.05, 20) : scale(0.055, 22),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 15 : 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 20 : 30,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: isSmallScreen ? 12 : 16,
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: isSmallScreen ? 40 : 50,
    height: isSmallScreen ? 40 : 50,
    borderRadius: isSmallScreen ? 20 : 25,
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 10,
  },
  featureTitle: {
    fontSize: isSmallScreen ? scale(0.035, 14) : scale(0.038, 15),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  featureDescription: {
    fontSize: isSmallScreen ? scale(0.03, 12) : scale(0.032, 13),
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 16 : 18,
  },
  ctaSection: {
    alignItems: 'center',
    paddingTop: isSmallScreen ? 10 : 15,
    marginBottom: isSmallScreen ? 20 : 30,
  },
  primaryButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 24 : 28,
    borderRadius: 30,
    width: '80%',
    maxWidth: 320,
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryText: {
    color: '#fff',
    fontSize: isSmallScreen ? scale(0.04, 16) : scale(0.045, 18),
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryText: {
    color: '#E0E0E0',
    fontSize: isSmallScreen ? scale(0.035, 14) : scale(0.038, 15),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});