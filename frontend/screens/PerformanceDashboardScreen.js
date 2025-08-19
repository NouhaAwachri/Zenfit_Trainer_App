import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Replace with your actual backend IP
const BACKEND_URL = 'http://192.168.1.10:5000';

// Avatar levels configuration
const AVATAR_LEVELS = [
  { level: 1, name: 'Beginner', xpRequired: 0, avatar: '🐣', color: ['#FFE082', '#FFC107'] },
  { level: 2, name: 'Rookie', xpRequired: 100, avatar: '🐤', color: ['#A5D6A7', '#4CAF50'] },
  { level: 3, name: 'Explorer', xpRequired: 300, avatar: '🦊', color: ['#90CAF9', '#2196F3'] },
  { level: 4, name: 'Warrior', xpRequired: 600, avatar: '🦁', color: ['#FFAB91', '#FF5722'] },
  { level: 5, name: 'Champion', xpRequired: 1000, avatar: '🐉', color: ['#CE93D8', '#9C27B0'] },
  { level: 6, name: 'Legend', xpRequired: 1500, avatar: '🦅', color: ['#F48FB1', '#E91E63'] },
  { level: 7, name: 'Master', xpRequired: 2200, avatar: '🔥', color: ['#FFCC80', '#FF9800'] },
  { level: 8, name: 'Grandmaster', xpRequired: 3000, avatar: '⚡', color: ['#B39DDB', '#673AB7'] },
  { level: 9, name: 'Elite', xpRequired: 4000, avatar: '👑', color: ['#FFD54F', '#FFC107'] },
  { level: 10, name: 'Legendary', xpRequired: 5500, avatar: '🌟', color: ['#81C784', '#4CAF50'] }
];

// XP calculation based on achievements
const calculateXP = (achievements) => {
  const xpValues = {
    'workout': 50,
    'consistency': 75,
    'milestone': 100,
    'streak': 60,
    'improvement': 80,
    'challenge': 120
  };
  
  return achievements.reduce((total, achievement) => {
    const category = achievement.category?.toLowerCase() || 'workout';
    return total + (xpValues[category] || 50);
  }, 0);
};

// Get current level based on XP
const getCurrentLevel = (xp) => {
  for (let i = AVATAR_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= AVATAR_LEVELS[i].xpRequired) {
      return AVATAR_LEVELS[i];
    }
  }
  return AVATAR_LEVELS[0];
};

// Get next level
const getNextLevel = (currentLevel) => {
  const currentIndex = AVATAR_LEVELS.findIndex(level => level.level === currentLevel.level);
  return currentIndex < AVATAR_LEVELS.length - 1 ? AVATAR_LEVELS[currentIndex + 1] : null;
};


const PerformanceDashboardScreen = ({ navigation, user }) => {
  // State management
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30_days');
  const [activeTab, setActiveTab] = useState('overview');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const avatarBounce = useRef(new Animated.Value(1)).current;

  // Tab options
  const tabOptions = [
    { key: 'overview', label: 'Overview', icon: 'analytics' },
    { key: 'achievements', label: 'Achievements', icon: 'trophy' },
    { key: 'trends', label: 'Trends', icon: 'trending-up' },
    { key: 'recommendations', label: 'Tips', icon: 'bulb' }
  ];

  // Fetch dashboard data
  const fetchDashboardData = async (period = selectedPeriod, showLoader = true) => {
    if (!user?.uid) {
      setError("User not found");
      setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError(null);

      console.log(`📊 Fetching dashboard for user: ${user.uid}, period: ${period}`);
      
      const response = await fetch(`${BACKEND_URL}/dashboard/full/${user.uid}?period=${period}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("✅ Dashboard data received");

      setDashboardData(data.dashboard);
      setError(null);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();

    } catch (err) {
      console.error("❌ Error fetching dashboard:", err);
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(selectedPeriod, false);
  };

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchDashboardData(period, true);
  };

  // Load data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Animate XP bar when data loads
  useEffect(() => {
    if (dashboardData?.achievements) {
      const achievements = dashboardData.achievements || [];
      const xp = calculateXP(achievements);
      const currentLevel = getCurrentLevel(xp);
      const nextLevel = getNextLevel(currentLevel);
      
      if (nextLevel) {
        const progress = (xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired);
        Animated.timing(xpBarAnim, {
          toValue: Math.min(progress, 1),
          duration: 1500,
          useNativeDriver: false,
        }).start();
      } else {
        xpBarAnim.setValue(1);
      }

      // Avatar bounce animation
      Animated.sequence([
        Animated.timing(avatarBounce, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(avatarBounce, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [dashboardData]);

  // Loading state
  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Performance Dashboard</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Analyzing your performance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Performance Dashboard</Text>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <LinearGradient colors={['#ff9a9e', '#fecfef']} style={styles.errorIconContainer}>
            <Ionicons name="analytics" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Dashboard Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboardData()}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.retryGradient}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main render function
  const renderOverviewTab = () => {
    const metrics = dashboardData?.performance_metrics?.summary || {};
    const insights = dashboardData?.ai_insights || "";

    return (
      <View>
        {/* Key Metrics Cards */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsScrollContent}>
            <View style={styles.metricCard}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.metricGradient}>
                <Ionicons name="fitness" size={24} color="#fff" />
                <Text style={styles.metricValue}>{metrics.total_workouts || 0}</Text>
                <Text style={styles.metricLabel}>Total Workouts</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.metricCard}>
              <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.metricGradient}>
                <Ionicons name="time" size={24} color="#fff" />
                <Text style={styles.metricValue}>{metrics.total_time_hours || 0}h</Text>
                <Text style={styles.metricLabel}>Time Invested</Text>
              </LinearGradient>
            </View>

            <View style={styles.metricCard}>
              <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.metricGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.metricValue}>{metrics.completion_rate || 0}%</Text>
                <Text style={styles.metricLabel}>Completion Rate</Text>
              </LinearGradient>
            </View>

            <View style={styles.metricCard}>
              <LinearGradient colors={['#43e97b', '#38f9d7']} style={styles.metricGradient}>
                <Ionicons name="calendar" size={24} color="#fff" />
                <Text style={styles.metricValue}>{metrics.weekly_frequency?.toFixed(1) || 0}</Text>
                <Text style={styles.metricLabel}>Weekly Frequency</Text>
              </LinearGradient>
            </View>
          </ScrollView>
        </View>

        {/* AI Insights */}
        {insights && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
            <View style={styles.insightsCard}>
              <Text style={styles.insightsText}>{insights}</Text>
            </View>
          </View>
        )}

        {/* Consistency Section */}
        {dashboardData?.performance_metrics?.consistency && (
          <View style={styles.consistencyContainer}>
            <Text style={styles.sectionTitle}>⚡ Consistency</Text>
            {renderConsistencyCard(dashboardData.performance_metrics.consistency)}
          </View>
        )}
      </View>
    );
  };

  const renderConsistencyCard = (consistency) => {
    const score = consistency.consistency_score || 0;
    const currentStreak = consistency.current_streak || 0;
    const longestStreak = consistency.longest_streak || 0;

    return (
      <View style={styles.consistencyCard}>
        <View style={styles.consistencyRow}>
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>{score}%</Text>
            <Text style={styles.consistencyLabel}>Consistency Score</Text>
          </View>
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>{currentStreak}</Text>
            <Text style={styles.consistencyLabel}>Current Streak</Text>
          </View>
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>{longestStreak}</Text>
            <Text style={styles.consistencyLabel}>Best Streak</Text>
          </View>
        </View>
        
        {/* Progress bar for consistency score */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${Math.min(score, 100)}%` }]} />
          </View>
          <Text style={styles.progressBarText}>Consistency Progress</Text>
        </View>
      </View>
    );
  };

  const renderPlayerLevel = () => {
    const achievements = dashboardData?.achievements || [];
    const xp = calculateXP(achievements);
    const currentLevel = getCurrentLevel(xp);
    const nextLevel = getNextLevel(currentLevel);
    
    let xpProgress = 1;
    let xpCurrent = xp;
    let xpNeeded = 0;
    
    if (nextLevel) {
      xpCurrent = xp - currentLevel.xpRequired;
      xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
      xpProgress = xpCurrent / xpNeeded;
    }

    return (
      <View style={styles.playerLevelContainer}>
        <LinearGradient colors={currentLevel.color} style={styles.playerLevelCard}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarBounce }] }]}>
              <Text style={styles.avatarEmoji}>{currentLevel.avatar}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{currentLevel.level}</Text>
              </View>
            </Animated.View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelName}>{currentLevel.name}</Text>
              <Text style={styles.totalXP}>{xp} XP Total</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          {nextLevel && (
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpProgressInfo}>
                <Text style={styles.xpProgressText}>
                  {xpCurrent} / {xpNeeded} XP to {nextLevel.name}
                </Text>
                <Text style={styles.xpProgressPercent}>
                  {Math.round(xpProgress * 100)}%
                </Text>
              </View>
              <View style={styles.xpProgressBar}>
                <Animated.View 
                  style={[
                    styles.xpProgressFill, 
                    { 
                      width: xpBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
              <View style={styles.nextLevelPreview}>
                <Text style={styles.nextLevelText}>Next: {nextLevel.avatar} {nextLevel.name}</Text>
              </View>
            </View>
          )}

          {/* Max Level Indicator */}
          {!nextLevel && (
            <View style={styles.maxLevelContainer}>
              <Text style={styles.maxLevelText}>🌟 MAX LEVEL REACHED! 🌟</Text>
              <Text style={styles.maxLevelSubtext}>You are a true fitness legend!</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderAchievementsTab = () => {
    const achievements = dashboardData?.achievements || [];

    return (
      <View style={styles.achievementsContainer}>
        {/* Player Level Section */}
        {renderPlayerLevel()}

        {/* Level Progression Preview */}
        <View style={styles.levelProgressionContainer}>
          <Text style={styles.sectionTitle}>🎯 Level Progression</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.levelProgressionRow}>
              {AVATAR_LEVELS.map((level, index) => {
                const achievements = dashboardData?.achievements || [];
                const userXP = calculateXP(achievements);
                const isUnlocked = userXP >= level.xpRequired;
                const isCurrent = getCurrentLevel(userXP).level === level.level;
                
                return (
                  <View key={level.level} style={styles.levelPreviewCard}>
                    <LinearGradient 
                      colors={isUnlocked ? level.color : ['#f5f5f5', '#e0e0e0']} 
                      style={[
                        styles.levelPreviewGradient,
                        isCurrent && styles.currentLevelPreview
                      ]}
                    >
                      <Text style={[
                        styles.levelPreviewAvatar,
                        !isUnlocked && styles.lockedAvatar
                      ]}>
                        {isUnlocked ? level.avatar : '🔒'}
                      </Text>
                      <Text style={[
                        styles.levelPreviewNumber,
                        !isUnlocked && styles.lockedText
                      ]}>
                        {level.level}
                      </Text>
                    </LinearGradient>
                    <Text style={[
                      styles.levelPreviewName,
                      !isUnlocked && styles.lockedText
                    ]}>
                      {level.name}
                    </Text>
                    <Text style={[
                      styles.levelPreviewXP,
                      !isUnlocked && styles.lockedText
                    ]}>
                      {level.xpRequired} XP
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Achievements List */}
        <Text style={styles.sectionTitle}>🏆 Your Achievements</Text>
        {achievements.length > 0 ? (
          achievements.map((achievement, index) => {
            const xpValue = {
              'workout': 50,
              'consistency': 75,
              'milestone': 100,
              'streak': 60,
              'improvement': 80,
              'challenge': 120
            }[achievement.category?.toLowerCase()] || 50;

            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.achievementCard,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(index * 5)) }]
                  }
                ]}
              >
                <View style={styles.achievementIcon}>
                  <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                </View>
                <View style={styles.achievementContent}>
                  <View style={styles.achievementHeader}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>+{xpValue} XP</Text>
                    </View>
                  </View>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementCategory}>{achievement.category}</Text>
                </View>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>Keep working out to unlock achievements and level up!</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTrendsTab = () => {
    const trends = dashboardData?.trends || {};
    const timeline = trends.timeline_data || [];

    return (
      <View style={styles.trendsContainer}>
        <Text style={styles.sectionTitle}>📈 Performance Trends</Text>
        
        {/* Trend Summary */}
        <View style={styles.trendSummaryCard}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Workout Frequency</Text>
            <View style={[styles.trendIndicator, { 
              backgroundColor: trends.workout_frequency_trend === 'improving' ? '#4CAF50' : 
                             trends.workout_frequency_trend === 'declining' ? '#f44336' : '#FF9800' 
            }]}>
              <Ionicons 
                name={trends.workout_frequency_trend === 'improving' ? 'trending-up' : 
                     trends.workout_frequency_trend === 'declining' ? 'trending-down' : 'remove'} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.trendText}>{trends.workout_frequency_trend || 'stable'}</Text>
            </View>
          </View>

          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Duration Trend</Text>
            <View style={[styles.trendIndicator, { 
              backgroundColor: trends.duration_trend === 'improving' ? '#4CAF50' : 
                             trends.duration_trend === 'declining' ? '#f44336' : '#FF9800' 
            }]}>
              <Ionicons 
                name={trends.duration_trend === 'improving' ? 'trending-up' : 
                     trends.duration_trend === 'declining' ? 'trending-down' : 'remove'} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.trendText}>{trends.duration_trend || 'stable'}</Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress */}
        {timeline.length > 0 && (
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Weekly Progress</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.timelineChart}>
                {timeline.map((week, index) => (
                  <View key={index} style={styles.timelineWeek}>
                    <View style={[
                      styles.timelineBar,
                      { height: Math.max(10, (week.workout_count / 7) * 80) }
                    ]} />
                    <Text style={styles.timelineValue}>{week.workout_count}</Text>
                    <Text style={styles.timelineLabel}>Week {index + 1}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderRecommendationsTab = () => {
    const recommendations = dashboardData?.recommendations || [];

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>💡 Personalized Tips</Text>
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View style={[styles.priorityBadge, { 
                  backgroundColor: rec.priority === 'high' ? '#f44336' : 
                                 rec.priority === 'medium' ? '#FF9800' : '#4CAF50' 
                }]}>
                  <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
                </View>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
              </View>
              <Text style={styles.recommendationDescription}>{rec.description}</Text>
              
              {rec.actionable_steps && (
                <View style={styles.actionStepsContainer}>
                  <Text style={styles.actionStepsTitle}>Action Steps:</Text>
                  {rec.actionable_steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.actionStep}>
                      <Text style={styles.actionStepBullet}>•</Text>
                      <Text style={styles.actionStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>You're doing great! Keep up the good work.</Text>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'achievements':
        return renderAchievementsTab();
      case 'trends':
        return renderTrendsTab();
      case 'recommendations':
        return renderRecommendationsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Performance Dashboard</Text>
          <Text style={styles.headerSubtitle}>{dashboardData?.period || 'Last 30 Days'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        {tabOptions.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.key ? '#667eea' : '#999'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.tabButtonTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerformanceDashboardScreen;
// ... keep all your imports + component code the same

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuButton: { marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 2 },
  refreshButton: { padding: 8 },

  // Loading / error
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorIconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  retryButton: { borderRadius: 25, overflow: 'hidden' },
  retryGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  retryButtonText: { color: '#fff', fontSize: 14, marginLeft: 6 },

  // Tabs
  tabSelector: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { alignItems: 'center', paddingVertical: 10, flex: 1 },
  tabButtonActive: { borderBottomWidth: 3, borderBottomColor: '#667eea' },
  tabButtonText: { fontSize: 12, color: '#999', marginTop: 4 },
  tabButtonTextActive: { color: '#667eea', fontWeight: 'bold' },

  // Content
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  // Metrics
  metricsContainer: { marginBottom: 20 },
  metricsScrollContent: { paddingRight: 20 },
  metricCard: { width: 140, height: 120, marginRight: 12, borderRadius: 16, overflow: 'hidden' },
  metricGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  metricValue: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 6 },
  metricLabel: { fontSize: 12, color: '#fff', marginTop: 2 },

  // Insights
  insightsContainer: { marginBottom: 20 },
  insightsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  insightsText: { fontSize: 14, color: '#555' },

  // Consistency
  consistencyContainer: { marginBottom: 20 },
  consistencyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  consistencyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  consistencyItem: { alignItems: 'center', flex: 1 },
  consistencyValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  consistencyLabel: { fontSize: 12, color: '#777' },
  progressBarContainer: { marginTop: 10 },
  progressBarBackground: { height: 8, borderRadius: 4, backgroundColor: '#eee', overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#667eea' },
  progressBarText: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },

  // Player Level
  playerLevelContainer: { marginBottom: 20 },
  playerLevelCard: { borderRadius: 16, padding: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 36 },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  levelNumber: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  levelInfo: { marginLeft: 12 },
  levelName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  totalXP: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  xpProgressContainer: { marginTop: 8 },
  xpProgressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpProgressText: { fontSize: 12, color: '#fff' },
  xpProgressPercent: { fontSize: 12, color: '#fff' },
  xpProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  xpProgressFill: { height: 8, backgroundColor: '#fff' },
  nextLevelPreview: { marginTop: 4 },
  nextLevelText: { fontSize: 12, color: '#fff' },
  maxLevelContainer: { marginTop: 10, alignItems: 'center' },
  maxLevelText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  maxLevelSubtext: { fontSize: 12, color: '#fff', marginTop: 2 },

  // Level Progression
  levelProgressionContainer: { marginBottom: 20 },
  levelProgressionRow: { flexDirection: 'row', alignItems: 'center' },
  levelPreviewCard: { width: 80, alignItems: 'center', marginRight: 12 },
  levelPreviewGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  currentLevelPreview: { borderWidth: 2, borderColor: '#333' },
  levelPreviewAvatar: { fontSize: 28 },
  lockedAvatar: { color: '#999' },
  levelPreviewNumber: { fontSize: 12, color: '#333', marginTop: 4 },
  levelPreviewName: { fontSize: 12, color: '#333', marginTop: 2 },
  levelPreviewXP: { fontSize: 10, color: '#777' },
  lockedText: { color: '#aaa' },

  // Achievements
  achievementsContainer: { marginBottom: 20 },
  achievementCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  achievementIcon: { marginRight: 12, justifyContent: 'center' },
  achievementEmoji: { fontSize: 28 },
  achievementContent: { flex: 1 },
  achievementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  achievementTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  xpBadge: { backgroundColor: '#667eea', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  xpBadgeText: { color: '#fff', fontSize: 12 },
  achievementDescription: { fontSize: 13, color: '#666', marginTop: 4 },
  achievementCategory: { fontSize: 11, color: '#999', marginTop: 2 },
  emptyState: { alignItems: 'center', marginVertical: 40, paddingHorizontal: 20 },
  emptyStateText: { marginTop: 12, fontSize: 14, color: '#666', textAlign: 'center' },

  // Trends
  trendsContainer: { marginBottom: 20 },
  trendSummaryCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2 },
  trendItem: { flex: 1, marginHorizontal: 6 },
  trendLabel: { fontSize: 12, color: '#555', marginBottom: 6 },
  trendIndicator: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 6 },
  trendText: { marginLeft: 6, color: '#fff', fontSize: 12 },
  timelineContainer: { marginBottom: 20 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  timelineChart: { flexDirection: 'row', alignItems: 'flex-end' },
  timelineWeek: { width: 50, alignItems: 'center', marginRight: 8 },
  timelineBar: { width: 20, borderRadius: 4, backgroundColor: '#667eea' },
  timelineValue: { fontSize: 12, marginTop: 4, color: '#333' },
  timelineLabel: { fontSize: 10, color: '#777', marginTop: 2 },

  // Recommendations
  recommendationsContainer: { marginBottom: 20 },
  recommendationCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  recommendationTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  recommendationDescription: { fontSize: 13, color: '#666', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionStepsContainer: { marginTop: 6 },
  actionStepsTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  actionStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  actionStepBullet: { fontSize: 14, marginRight: 6 },
  actionStepText: { fontSize: 13, color: '#555' },
});
