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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function HomeScreen({ navigation, user }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  const username = user?.displayName || user?.email || 'User';

  React.useEffect(() => {
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
  }, []);

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

              {/* Chat Button */}
              <ButtonComponent
                onPress={() => navigation.navigate('Chatbot')}
                style={{ backgroundColor: '#00796B' }}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="chatbubbles" size={24} color="white" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>Chat with Coach</Text>
                    <Text style={styles.buttonSubtitle}>Get instant fitness advice</Text>
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

            {/* Stats Cards */}
            <Animated.View
              style={[
                styles.statsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.statsCard}>
                <Ionicons name="flame" size={24} color="#FF6B35" />
                <Text style={styles.statsNumber}>0</Text>
                <Text style={styles.statsLabel}>Workouts</Text>
              </View>
              <View style={styles.statsCard}>
                <Ionicons name="time" size={24} color="#4CAF50" />
                <Text style={styles.statsNumber}>0</Text>
                <Text style={styles.statsLabel}>Minutes</Text>
              </View>
              <View style={styles.statsCard}>
                <Ionicons name="trophy" size={24} color="#FFD700" />
                <Text style={styles.statsNumber}>0</Text>
                <Text style={styles.statsLabel}>Goals</Text>
              </View>
            </Animated.View>

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
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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