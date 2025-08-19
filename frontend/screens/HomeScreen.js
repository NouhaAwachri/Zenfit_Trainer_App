import React, { useState, useEffect } from 'react';
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
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Replace with your actual backend IP
const BACKEND_URL = 'http://192.168.1.10:5000';

const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function HomeScreen({ navigation, user }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
  // Add new state for KPIs
  const [kpiData, setKpiData] = useState({
    totalWorkouts: 0,
    totalTimeHours: 0,
    achievementsUnlocked: 0,
    loading: true,
    error: null,
    refreshing: false
  });

  const username = user?.displayName || user?.email || 'User';

  // Fetch KPI data from dashboard endpoint
  const fetchKPIData = async (showRefreshing = false) => {
    if (!user?.uid) {
      setKpiData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      if (showRefreshing) {
        setKpiData(prev => ({ ...prev, refreshing: true }));
      } else {
        setKpiData(prev => ({ ...prev, loading: true }));
      }

      console.log(`📊 Fetching KPI data for user: ${user.uid}`);
      
      // Use the same endpoint as your dashboard
      const response = await fetch(`${BACKEND_URL}/dashboard/full/${user.uid}?period=all_time`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("✅ KPI data received:", data);

      // Extract the metrics we need from your backend structure
      const metrics = data.dashboard?.performance_metrics?.summary || {};
      const achievements = data.dashboard?.achievements || [];

      setKpiData({
        totalWorkouts: metrics.total_workouts || 0,
        totalTimeHours: Math.round(metrics.total_time_hours || 0),
        achievementsUnlocked: achievements.length || 0,
        loading: false,
        error: null,
        refreshing: false
      });

    } catch (err) {
      console.error("❌ Error fetching KPI data:", err);
      setKpiData(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: `Failed to load stats: ${err.message}`
      }));
    }
  };

  React.useEffect(() => {
    // Animate the screen
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
    ]).start();

    // Fetch KPI data when screen loads
    fetchKPIData();
  }, [user]);

  // Add refresh functionality
  const handleRefresh = () => {
    fetchKPIData(true);
  };

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

  const ButtonComponent = ({ onPress, style, children, gradient = false }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.buttonContainer, style]}
    >
      {gradient ? (
        <LinearGradient
          colors={['#9C27B0', '#7B1FA2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          {children}
        </LinearGradient>
      ) : (
        <View style={styles.regularButton}>
          {children}
        </View>
      )}
    </TouchableOpacity>
  );

  // Enhanced Stats Card Component
  const StatsCard = ({ icon, iconColor, number, label, loading }) => {
    const numberAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
      if (!loading && number > 0) {
        // Animate number counting up
        Animated.timing(numberAnim, {
          toValue: number,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      }
    }, [loading, number]);

    const handlePress = () => {
      // Scale animation on press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Refresh data
      handleRefresh();
    };

    return (
      <Animated.View style={[styles.statsCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity 
          style={styles.statsCardContent}
          activeOpacity={0.8}
          onPress={handlePress}
        >
          <Ionicons name={icon} size={24} color={iconColor} />
          
          {loading ? (
            <ActivityIndicator 
              size="small" 
              color="#fff" 
              style={{ marginTop: 8, marginBottom: 4 }} 
            />
          ) : (
            <Animated.Text style={styles.statsNumber}>
              {number}
            </Animated.Text>
          )}
          
          <Text style={styles.statsLabel}>{label}</Text>
          
          {/* Add a small refresh indicator */}
          <View style={styles.refreshIndicator}>
            <Ionicons name="refresh-outline" size={12} color="rgba(255,255,255,0.5)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('../assets/home.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.openDrawer()}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="menu" size={24} color="white" />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <View style={styles.userIconContainer}>
                <Ionicons name="person-circle" size={28} color="#9C27B0" />
              </View>
              <View style={styles.userTextContainer}>
                <Text style={styles.greetingText}>Hello</Text>
                <Text style={styles.usernameText} numberOfLines={1} ellipsizeMode="tail">
                  {username}
                </Text>
              </View>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView
            contentContainerStyle={styles.contentWrapper}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={kpiData.refreshing}
                onRefresh={handleRefresh}
                tintColor="#9C27B0"
                colors={['#9C27B0']}
              />
            }
          >
            <Animated.View
              style={[
                styles.titleContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.title}>AI Personal Trainer</Text>
              <View style={styles.subtitleContainer}>
                <View style={styles.accentLine} />
                <Text style={styles.subtitle}>Smarter Fitness. Real Results.</Text>
                <View style={styles.accentLine} />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.buttonsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Generate Program Button */}
              <ButtonComponent
                onPress={() => navigation.navigate('GenProgram')}
                gradient={true}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="fitness" size={24} color="white" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>Generate Workout</Text>
                    <Text style={styles.buttonSubtitle}>Create personalized programs</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              </ButtonComponent>

              <ButtonComponent
                onPress={() => navigation.navigate('WorkoutLogs')}
                gradient={true}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="analytics" size={24} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>Log your workout sessions </Text>
                    <Text style={styles.buttonSubtitle}>Keep track of your progress</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              </ButtonComponent>

              {/* Progress Button */}
              <ButtonComponent
                onPress={() => navigation.navigate('Dashboard')}
                style={styles.outlineButton}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="analytics" size={24} color="#9C27B0" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={[styles.buttonTitle, { color: '#fff' }]}>View Progress</Text>
                    <Text style={[styles.buttonSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                      Track your achievements
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              </ButtonComponent>
            </Animated.View>

            {/* Enhanced Stats Cards with Real Data */}
            <Animated.View
              style={[
                styles.statsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <StatsCard
                icon="flame"
                iconColor="#FF6B35"
                number={kpiData.totalWorkouts}
                label="Workouts"
                loading={kpiData.loading}
              />
              
              <StatsCard
                icon="time"
                iconColor="#4CAF50"
                number={kpiData.totalTimeHours}
                label="Hours"
                loading={kpiData.loading}
              />
              
              <StatsCard
                icon="trophy"
                iconColor="#FFD700"
                number={kpiData.achievementsUnlocked}
                label="Achievements"
                loading={kpiData.loading}
              />
            </Animated.View>

            {/* Error Message */}
            {kpiData.error && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  {
                    opacity: fadeAnim,
                  }
                ]}
              >
                <Ionicons name="warning-outline" size={20} color="#FF6B35" />
                <Text style={styles.errorText}>Pull down to refresh or tap cards to retry</Text>
              </Animated.View>
            )}

            {/* Quick Stats Summary */}
            {!kpiData.loading && !kpiData.error && (kpiData.totalWorkouts > 0 || kpiData.achievementsUnlocked > 0) && (
              <Animated.View
                style={[
                  styles.summaryContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <LinearGradient
                  colors={['rgba(156, 39, 176, 0.15)', 'rgba(156, 39, 176, 0.25)']}
                  style={styles.summaryGradient}
                >
                  <Ionicons name="trophy" size={20} color="#9C27B0" style={{ marginBottom: 8 }} />
                  <Text style={styles.summaryText}>
                    🔥 You've completed {kpiData.totalWorkouts} workouts and earned {kpiData.achievementsUnlocked} achievements! 
                    {kpiData.totalTimeHours > 0 && ` That's ${kpiData.totalTimeHours} hours of dedication!`}
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Motivational Message for New Users */}
            {!kpiData.loading && !kpiData.error && kpiData.totalWorkouts === 0 && (
              <Animated.View
                style={[
                  styles.welcomeContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <LinearGradient
                  colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.25)']}
                  style={styles.welcomeGradient}
                >
                  <Ionicons name="fitness" size={32} color="#4CAF50" style={{ marginBottom: 12 }} />
                  <Text style={styles.welcomeTitle}>Ready to Start Your Fitness Journey?</Text>
                  <Text style={styles.welcomeText}>
                    Generate your first workout program and begin tracking your progress!
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Logout Button */}
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color="#E53935" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
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
    paddingHorizontal: width * 0.05,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 20,
  },

  menuButton: {
    padding: 8,
  },

  menuIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 8,
    backdropFilter: 'blur(10px)',
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: width * 0.5,
  },

  userIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 2,
    marginRight: 12,
  },

  userTextContainer: {
    alignItems: 'flex-end',
  },

  greetingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scale(0.032, 12),
    fontWeight: '400',
  },

  usernameText: {
    color: '#fff',
    fontSize: scale(0.04, 16),
    fontWeight: '600',
  },

  contentWrapper: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: scale(0.08, 32),
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },

  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  accentLine: {
    height: 2,
    width: 30,
    backgroundColor: '#9C27B0',
    marginHorizontal: 15,
  },

  subtitle: {
    fontSize: scale(0.042, 16),
    color: '#eee',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.5,
  },

  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },

  buttonContainer: {
    width: width * 0.85,
    maxWidth: 350,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },

  gradientButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  regularButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#00796B',
    borderRadius: 16,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(156, 39, 176, 0.8)',
    borderWidth: 2,
    borderRadius: 16,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  buttonIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 8,
  },

  buttonTextContainer: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-start',
  },

  buttonTitle: {
    color: '#fff',
    fontSize: scale(0.042, 16),
    fontWeight: 'bold',
    marginBottom: 2,
  },

  buttonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scale(0.032, 12),
    fontWeight: '400',
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  statsCard: {
    flex: 1,
    marginHorizontal: 8,
  },

  statsCardContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    minHeight: 100,
  },

  statsNumber: {
    color: '#fff',
    fontSize: scale(0.06, 24),
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },

  statsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scale(0.032, 12),
    fontWeight: '500',
  },

  refreshIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    opacity: 0.5,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: '#FF6B35',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '90%',
  },

  errorText: {
    color: '#FF6B35',
    fontSize: scale(0.032, 12),
    fontWeight: '500',
    marginLeft: 8,
  },

  summaryContainer: {
    marginBottom: 20,
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  summaryGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.3)',
  },

  summaryText: {
    color: '#fff',
    fontSize: scale(0.038, 14),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  welcomeContainer: {
    marginBottom: 20,
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  welcomeGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },

  welcomeTitle: {
    color: '#fff',
    fontSize: scale(0.042, 16),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: scale(0.038, 14),
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderColor: '#E53935',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },

  logoutText: {
    color: '#E53935',
    fontSize: scale(0.038, 14),
    fontWeight: '600',
    marginLeft: 8,
  },
});