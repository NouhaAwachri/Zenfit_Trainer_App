import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const mockLogs = [
  {
    id: 1,
    date: '2025-07-19',
    workoutType: 'Push Day',
    duration: 65,
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8, rpe: 7 },
          { weight: 80, reps: 8, rpe: 7 },
          { weight: 80, reps: 7, rpe: 8 },
        ],
      },
      {
        name: 'Overhead Press',
        sets: [
          { weight: 50, reps: 10, rpe: 6 },
          { weight: 50, reps: 9, rpe: 7 },
          { weight: 50, reps: 8, rpe: 8 },
        ],
      },
      {
        name: 'Dips',
        sets: [
          { weight: 0, reps: 12, rpe: 6 },
          { weight: 0, reps: 11, rpe: 7 },
          { weight: 0, reps: 10, rpe: 8 },
        ],
      },
    ],
    energyLevel: 8,
    soreness: 3,
    notes: 'Felt strong today, good session',
  },
  {
    id: 2,
    date: '2025-07-17',
    workoutType: 'Pull Day',
    duration: 58,
    exercises: [
      {
        name: 'Deadlift',
        sets: [
          { weight: 120, reps: 5, rpe: 8 },
          { weight: 120, reps: 5, rpe: 8 },
          { weight: 120, reps: 4, rpe: 9 },
        ],
      },
      {
        name: 'Pull-ups',
        sets: [
          { weight: 0, reps: 8, rpe: 7 },
          { weight: 0, reps: 7, rpe: 8 },
          { weight: 0, reps: 6, rpe: 8 },
        ],
      },
      {
        name: 'Barbell Rows',
        sets: [
          { weight: 70, reps: 10, rpe: 6 },
          { weight: 70, reps: 9, rpe: 7 },
          { weight: 70, reps: 8, rpe: 8 },
        ],
      },
    ],
    energyLevel: 7,
    soreness: 4,
    notes: 'Lower back slightly tight',
  },
  {
    id: 3,
    date: '2025-07-15',
    workoutType: 'Leg Day',
    duration: 72,
    exercises: [
      {
        name: 'Squats',
        sets: [
          { weight: 100, reps: 8, rpe: 7 },
          { weight: 100, reps: 8, rpe: 8 },
          { weight: 100, reps: 6, rpe: 9 },
        ],
      },
      {
        name: 'Romanian Deadlift',
        sets: [
          { weight: 80, reps: 10, rpe: 6 },
          { weight: 80, reps: 9, rpe: 7 },
          { weight: 80, reps: 8, rpe: 8 },
        ],
      },
    ],
    energyLevel: 6,
    soreness: 7,
    notes: 'Challenging session, good form maintained',
  },
];

const WorkoutLogsScreen = ({ navigation, user }) => {
  const [expandedLog, setExpandedLog] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [logs] = useState(mockLogs);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Filter options with icons and colors
  const filterOptions = [
    { id: 'all', label: 'All Time', icon: 'calendar', gradient: ['#667eea', '#764ba2'] },
    { id: 'week', label: 'This Week', icon: 'calendar-outline', gradient: ['#f093fb', '#f5576c'] },
    { id: 'month', label: 'This Month', icon: 'calendar-sharp', gradient: ['#4facfe', '#00f2fe'] },
  ];
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getTotalVolume = (exercises) => {
    return exercises.reduce((total, exercise) => {
      return (
        total +
        exercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      );
    }, 0);
  };

  const getAverageRPE = (exercises) => {
    let totalRPE = 0;
    let count = 0;
    exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalRPE += set.rpe;
        count += 1;
      });
    });
    return count > 0 ? (totalRPE / count).toFixed(1) : 0;
  };


  // Quick stats for summary cards
  const quickStats = [
    { 
      id: 'total_workouts', 
      label: 'Total Workouts', 
      value: logs.length.toString(),
      icon: 'fitness',
      gradient: ['#667eea', '#764ba2'],
    },
    { 
      id: 'avg_duration', 
      label: 'Avg Duration', 
      value: `${Math.round(logs.reduce((sum, log) => sum + log.duration, 0) / logs.length)}min`,
      icon: 'time',
      gradient: ['#f093fb', '#f5576c'],
    },
    { 
      id: 'total_volume', 
      label: 'Total Volume', 
      value: `${Math.round(logs.reduce((sum, log) => sum + getTotalVolume(log.exercises), 0) / 1000)}k kg`,
      icon: 'trending-up',
      gradient: ['#4facfe', '#00f2fe'],
    },
  ];

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  
  const getWorkoutTypeGradient = (workoutType) => {
    const gradients = {
      'Push Day': ['#667eea', '#764ba2'],
      'Pull Day': ['#f093fb', '#f5576c'],
      'Leg Day': ['#4facfe', '#00f2fe'],
      'Upper Body': ['#a8edea', '#fed6e3'],
      'Full Body': ['#ffecd2', '#fcb69f'],
    };
    return gradients[workoutType] || ['#667eea', '#764ba2'];
  };

  const getWorkoutTypeIcon = (workoutType) => {
    const icons = {
      'Push Day': 'push',
      'Pull Day': 'pull',
      'Leg Day': 'walk',
      'Upper Body': 'fitness',
      'Full Body': 'body',
    };
    return icons[workoutType] || 'fitness';
  };

  const ExerciseDetail = ({ exercise }) => (
    <Animated.View
      style={[
        styles.exerciseCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.exerciseHeader}>
        <LinearGradient
          colors={['#6C63FF', '#9C63FF']}
          style={styles.exerciseIcon}
        >
          <Ionicons name="barbell" size={16} color="#fff" />
        </LinearGradient>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
      </View>
      
      <View style={styles.setsContainer}>
        {exercise.sets.map((set, idx) => (
          <View key={idx} style={styles.setRow}>
            <View style={styles.setNumber}>
              <Text style={styles.setNumberText}>{idx + 1}</Text>
            </View>
            <View style={styles.setDetails}>
              <Text style={styles.setWeight}>{set.weight}kg</Text>
              <Text style={styles.setReps}>×{set.reps}</Text>
            </View>
            <View style={styles.rpeContainer}>
              <Text style={styles.rpeLabel}>RPE</Text>
              <Text style={styles.rpeValue}>{set.rpe}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const StatCard = ({ stat }) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={stat.gradient}
        style={styles.statCardGradient}
      >
        <Ionicons name={stat.icon} size={24} color="#fff" />
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </LinearGradient>
    </View>
  );

  const LogItem = ({ item: log }) => {
    const isExpanded = expandedLog === log.id;
    const workoutGradient = getWorkoutTypeGradient(log.workoutType);
    const workoutIcon = getWorkoutTypeIcon(log.workoutType);

    return (
      <Animated.View
        style={[
          styles.logCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedLog(isExpanded ? null : log.id)}
          style={styles.logHeader}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={workoutGradient}
            style={styles.workoutTypeIcon}
          >
            <Ionicons name={workoutIcon} size={20} color="#fff" />
          </LinearGradient>
          
          <View style={styles.logHeaderContent}>
            <View style={styles.logTitleRow}>
              <Text style={styles.workoutTypeTitle}>{log.workoutType}</Text>
              <Text style={styles.workoutDate}>{formatDate(log.date)}</Text>
            </View>
            
            <View style={styles.logStatsRow}>
              <View style={styles.logStat}>
                <Ionicons name="time" size={12} color="#666" />
                <Text style={styles.logStatText}>{log.duration}min</Text>
              </View>
              <View style={styles.logStat}>
                <Ionicons name="trending-up" size={12} color="#666" />
                <Text style={styles.logStatText}>{getTotalVolume(log.exercises)}kg</Text>
              </View>
              <View style={styles.logStat}>
                <Ionicons name="speedometer" size={12} color="#666" />
                <Text style={styles.logStatText}>RPE {getAverageRPE(log.exercises)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.expandButton}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={styles.logDetails}>
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {log.exercises.map((exercise, i) => (
                <ExerciseDetail key={i} exercise={exercise} />
              ))}
            </View>
            
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>Session Feedback</Text>
              <View style={styles.feedbackGrid}>
                <View style={styles.feedbackItem}>
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.feedbackIcon}
                  >
                    <Ionicons name="battery-charging" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.feedbackLabel}>Energy</Text>
                  <Text style={styles.feedbackValue}>{log.energyLevel}/10</Text>
                </View>
                
                <View style={styles.feedbackItem}>
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    style={styles.feedbackIcon}
                  >
                    <Ionicons name="pulse" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.feedbackLabel}>Soreness</Text>
                  <Text style={styles.feedbackValue}>{log.soreness}/10</Text>
                </View>
              </View>
              
              {log.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Notes</Text>
                  <Text style={styles.notesText}>{log.notes}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Workout Logs</Text>
          <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          {quickStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </ScrollView>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={styles.filterButton}
              onPress={() => setFilterPeriod(filter.id)}
              activeOpacity={0.8}
            >
              {filterPeriod === filter.id ? (
                <LinearGradient
                  colors={filter.gradient}
                  style={styles.filterButtonActive}
                >
                  <Ionicons name={filter.icon} size={16} color="#fff" />
                  <Text style={styles.filterTextActive}>{filter.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterButtonInactive}>
                  <Ionicons name={filter.icon} size={16} color="#666" />
                  <Text style={styles.filterTextInactive}>{filter.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Workout Logs */}
      <FlatList
        data={logs}
        renderItem={({ item }) => <LogItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        style={styles.logsList}
        contentContainerStyle={styles.logsContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1000);
        }}
      />
    </SafeAreaView>
  );
};

export default WorkoutLogsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Stats Styles
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Filter Styles
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    gap: 8,
  },
  filterTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextInactive: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },

  // Logs List Styles
  logsList: {
    flex: 1,
  },
  logsContent: {
    padding: 20,
    paddingTop: 16,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  workoutTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logHeaderContent: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  workoutDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  logStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  expandButton: {
    padding: 4,
  },

  // Log Details Styles
  logDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exercisesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  setNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  setReps: {
    fontSize: 14,
    color: '#666',
  },
  rpeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  rpeLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  rpeValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },

  // Feedback Section Styles
  feedbackSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  feedbackGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  feedbackItem: {
    alignItems: 'center',
    gap: 8,
  },
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  feedbackValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});