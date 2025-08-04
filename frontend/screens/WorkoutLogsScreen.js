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
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Replace with your actual backend IP
const BACKEND_URL = 'http://192.168.1.10:5000';

const WorkoutLogsScreen = ({ navigation, user }) => {
  // State for current workout plan
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workoutProgress, setWorkoutProgress] = useState(null);
  
  // State for workout logs
  const [logs, setLogs] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('all');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'logs'
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  
  // Workout session state
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch current workout plan
  const fetchCurrentPlan = async () => {
    if (!user?.uid) {
      console.log("❌ No user UID available");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching current plan for user: ${user.uid}`);
      const response = await fetch(`${BACKEND_URL}/workout/current/${user.uid}`);
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("✅ Received plan data:", JSON.stringify(data, null, 2));
      
      setCurrentPlan(data);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching current plan:", err);
      setError(`Failed to load workout plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workout progress
  const fetchWorkoutProgress = async () => {
    if (!user?.uid) return;
    
    try {
      console.log(`🔄 Fetching progress for user: ${user.uid}`);
      const response = await fetch(`${BACKEND_URL}/workout/progress/${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Received progress data:", data);
        setWorkoutProgress(data.progress); // Note: accessing .progress from response
      } else {
        console.log(`❌ Progress fetch failed: ${response.status}`);
      }
    } catch (err) {
      console.error("❌ Error fetching progress:", err);
    }
  };

  // Fetch workout logs
  const fetchWorkoutLogs = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/workout/logs/${user.uid}?filter=${filterPeriod}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching logs:", err);
      setError(`Failed to load workout logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle exercise completion
  const toggleExerciseCompletion = async (exerciseId, completed, exerciseData = {}) => {
    try {
      console.log(`🔄 Toggling exercise ${exerciseId} to ${completed ? 'completed' : 'incomplete'}`);
      
      const response = await fetch(`${BACKEND_URL}/workout/exercise/${exerciseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: completed,
          ...exerciseData
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      console.log("✅ Exercise toggled successfully");
      
      // Refresh current plan to show updated completion status
      await fetchCurrentPlan();
      await fetchWorkoutProgress();
      
      return true;
    } catch (err) {
      console.error("❌ Error toggling exercise:", err);
      Alert.alert('Error', 'Failed to update exercise status');
      return false;
    }
  };

  // Start workout session
  const startWorkoutSession = (week, day, dayData) => {
    console.log(`🏃‍♂️ Starting workout session: Week ${week}, Day ${day}`);
    setActiveWorkout({ week, day, ...dayData });
    setWorkoutStartTime(Date.now());
    setWorkoutTimer(0);
    
    // Start timer
    const interval = setInterval(() => {
      setWorkoutTimer(prev => prev + 1);
    }, 1000);
    
    // Store interval ID to clear later
    setActiveWorkout(prev => ({ ...prev, intervalId: interval }));
  };

  // End workout session
  const endWorkoutSession = async (notes = '') => {
    if (!activeWorkout) return;
    
    try {
      console.log("🏁 Ending workout session");
      
      // Clear timer
      if (activeWorkout.intervalId) {
        clearInterval(activeWorkout.intervalId);
      }

      // Collect completed exercises data
      const completedExercises = activeWorkout.exercises
        .filter(ex => ex.completed)
        .map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          completed: true,
          notes: ex.notes || ''
        }));

      // Submit workout log
      const response = await fetch(`${BACKEND_URL}/workout/day/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          week: activeWorkout.week,
          day: activeWorkout.day,
          duration: Math.floor(workoutTimer / 60), // Convert to minutes
          notes: notes,
          exercises: completedExercises
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      Alert.alert(
        'Workout Complete! 🎉',
        `Great job! You completed ${completedExercises.length} exercises in ${Math.floor(workoutTimer / 60)} minutes.`,
        [{ text: 'OK', onPress: () => {
          setActiveWorkout(null);
          setWorkoutTimer(0);
          setWorkoutStartTime(null);
          fetchWorkoutLogs();
          fetchWorkoutProgress();
        }}]
      );

    } catch (err) {
      console.error("❌ Error ending workout:", err);
      Alert.alert('Error', 'Failed to save workout session');
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load data on component mount and tab change
  useEffect(() => {
    console.log(`🔄 Tab changed to: ${activeTab}`);
    if (activeTab === 'current') {
      fetchCurrentPlan();
      fetchWorkoutProgress();
    } else {
      fetchWorkoutLogs();
    }
  }, [user, activeTab, filterPeriod]);

  // Animation effect
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [currentPlan, logs]);

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Time', icon: 'calendar' },
    { id: 'week', label: 'This Week', icon: 'calendar-outline' },
    { id: 'month', label: 'This Month', icon: 'calendar-sharp' },
  ];

  // Progress stats for current plan
  const getProgressStats = () => {
    if (!workoutProgress) {
      // Fallback stats from current plan if progress isn't available
      const completion = currentPlan?.completion_percentage || 0;
      return [
        {
          id: 'completion',
          label: 'Completion',
          value: `${Math.round(completion)}%`,
          icon: 'checkmark-circle',
          gradient: ['#667eea', '#764ba2'],
        },
        {
          id: 'workouts',
          label: 'Workouts',
          value: '0',
          icon: 'fitness',
          gradient: ['#f093fb', '#f5576c'],
        },
        {
          id: 'streak',
          label: 'Streak',
          value: '0d',
          icon: 'flame',
          gradient: ['#4facfe', '#00f2fe'],
        },
      ];
    }
    
    return [
      {
        id: 'completion',
        label: 'Completion',
        value: `${Math.round(workoutProgress.completion_percentage || 0)}%`,
        icon: 'checkmark-circle',
        gradient: ['#667eea', '#764ba2'],
      },
      {
        id: 'workouts',
        label: 'Workouts',
        value: (workoutProgress.total_workouts || 0).toString(),
        icon: 'fitness',
        gradient: ['#f093fb', '#f5576c'],
      },
      {
        id: 'streak',
        label: 'Streak',
        value: `${workoutProgress.current_streak || 0}d`,
        icon: 'flame',
        gradient: ['#4facfe', '#00f2fe'],
      },
    ];
  };

  // Exercise Modal Component
  const ExerciseModal = () => (
    <Modal
      visible={showExerciseModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowExerciseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.exerciseDetails}>
            <View style={styles.exerciseMetric}>
              <Text style={styles.metricLabel}>Sets</Text>
              <Text style={styles.metricValue}>{selectedExercise?.sets}</Text>
            </View>
            <View style={styles.exerciseMetric}>
              <Text style={styles.metricLabel}>Reps</Text>
              <Text style={styles.metricValue}>{selectedExercise?.reps}</Text>
            </View>
            <View style={styles.exerciseMetric}>
              <Text style={styles.metricLabel}>Rest</Text>
              <Text style={styles.metricValue}>{selectedExercise?.rest_seconds || 60}s</Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.completionButton,
                selectedExercise?.completed ? styles.completedButton : styles.incompleteButton
              ]}
              onPress={async () => {
                const success = await toggleExerciseCompletion(
                  selectedExercise.id,
                  !selectedExercise.completed
                );
                if (success) {
                  setShowExerciseModal(false);
                }
              }}
            >
              <Ionicons 
                name={selectedExercise?.completed ? "checkmark-circle" : "circle-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.completionButtonText}>
                {selectedExercise?.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Current Plan Tab Component
  const CurrentPlanTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading workout plan...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning" size={64} color="#f5576c" />
          <Text style={styles.emptyTitle}>Error Loading Plan</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCurrentPlan}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentPlan) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Workout Plan</Text>
          <Text style={styles.emptyText}>Generate a workout plan to start tracking your progress!</Text>
        </View>
      );
    }

    const progressStats = getProgressStats();

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Active Workout Header */}
        {activeWorkout && (
          <View style={styles.activeWorkoutHeader}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.activeWorkoutGradient}
            >
              <View style={styles.activeWorkoutInfo}>
                <Text style={styles.activeWorkoutTitle}>
                  Week {activeWorkout.week}, Day {activeWorkout.day}
                </Text>
                <Text style={styles.activeWorkoutTimer}>{formatTime(workoutTimer)}</Text>
              </View>
              <TouchableOpacity
                style={styles.endWorkoutButton}
                onPress={() => endWorkoutSession()}
              >
                <Text style={styles.endWorkoutText}>Finish</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Progress Stats */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {progressStats.map((stat) => (
              <View key={stat.id} style={styles.statCard}>
                <LinearGradient colors={stat.gradient} style={styles.statCardGradient}>
                  <Ionicons name={stat.icon} size={24} color="#fff" />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Workout Plan */}
        <View style={styles.planContainer}>
          <Text style={styles.planTitle}>{currentPlan.program_name}</Text>
          
          {/* Debug info */}
          {__DEV__ && (
            <Text style={styles.debugText}>
              Plan structure: {JSON.stringify(Object.keys(currentPlan.plan || {}), null, 2)}
            </Text>
          )}
          
          {Object.entries(currentPlan.plan || {}).map(([weekKey, weekData]) => {
            const weekNum = weekKey.replace('Week ', '');
            const isWeekExpanded = expandedWeek === weekKey;
            
            return (
              <View key={weekKey} style={styles.weekContainer}>
                <TouchableOpacity
                  style={styles.weekHeader}
                  onPress={() => setExpandedWeek(isWeekExpanded ? null : weekKey)}
                >
                  <Text style={styles.weekTitle}>{weekKey}</Text>
                  <Ionicons 
                    name={isWeekExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {isWeekExpanded && (
                  <View style={styles.weekContent}>
                    {Object.entries(weekData || {}).map(([dayKey, dayData]) => {
                      const dayNum = dayKey.replace('Day ', '');
                      const isDayExpanded = expandedDay === `${weekKey}-${dayKey}`;
                      const exercises = dayData?.exercises || [];
                      const completedExercises = exercises.filter(ex => ex.completed).length;
                      const totalExercises = exercises.length;
                      const dayProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
                      
                      return (
                        <View key={dayKey} style={styles.dayContainer}>
                          <TouchableOpacity
                            style={styles.dayHeader}
                            onPress={() => setExpandedDay(isDayExpanded ? null : `${weekKey}-${dayKey}`)}
                          >
                            <View style={styles.dayHeaderLeft}>
                              <LinearGradient
                                colors={dayProgress === 100 ? ['#4CAF50', '#45a049'] : ['#667eea', '#764ba2']}
                                style={styles.dayIcon}
                              >
                                <Ionicons 
                                  name={dayProgress === 100 ? "checkmark" : "fitness"} 
                                  size={16} 
                                  color="#fff" 
                                />
                              </LinearGradient>
                              <View>
                                <Text style={styles.dayTitle}>{dayData?.label || `Day ${dayNum}`}</Text>
                                <Text style={styles.dayProgress}>
                                  {completedExercises}/{totalExercises} exercises
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.dayHeaderRight}>
                              <TouchableOpacity
                                style={styles.startWorkoutButton}
                                onPress={() => startWorkoutSession(weekNum, dayNum, dayData)}
                              >
                                <Ionicons name="play" size={16} color="#fff" />
                              </TouchableOpacity>
                              <Ionicons 
                                name={isDayExpanded ? "chevron-up" : "chevron-down"} 
                                size={16} 
                                color="#666" 
                              />
                            </View>
                          </TouchableOpacity>
                          
                          {isDayExpanded && (
                            <Animated.View style={[styles.exercisesList, { opacity: fadeAnim }]}>
                              {exercises.map((exercise, index) => (
                                <TouchableOpacity
                                  key={exercise.id || `${dayKey}-${index}`}
                                  style={[
                                    styles.exerciseItem,
                                    exercise.completed && styles.exerciseCompleted
                                  ]}
                                  onPress={() => {
                                    setSelectedExercise(exercise);
                                    setShowExerciseModal(true);
                                  }}
                                >
                                  <View style={styles.exerciseItemLeft}>
                                    <TouchableOpacity
                                      style={[
                                        styles.exerciseCheckbox,
                                        exercise.completed && styles.exerciseCheckboxChecked
                                      ]}
                                      onPress={() => toggleExerciseCompletion(exercise.id, !exercise.completed)}
                                    >
                                      {exercise.completed && (
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                      )}
                                    </TouchableOpacity>
                                    <View style={styles.exerciseInfo}>
                                      <Text style={[
                                        styles.exerciseName,
                                        exercise.completed && styles.exerciseNameCompleted
                                      ]}>
                                        {exercise.name}
                                      </Text>
                                      <Text style={styles.exerciseDetails}>
                                        {exercise.sets} sets × {exercise.reps} reps
                                      </Text>
                                    </View>
                                  </View>
                                  
                                  <Ionicons name="chevron-forward" size={16} color="#999" />
                                </TouchableOpacity>
                              ))}
                            </Animated.View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Workout Logs Tab Component
  const WorkoutLogsTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading workout logs...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Filter Bar */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  filterPeriod === filter.id && styles.filterButtonActive
                ]}
                onPress={() => setFilterPeriod(filter.id)}
              >
                <Ionicons 
                  name={filter.icon} 
                  size={16} 
                  color={filterPeriod === filter.id ? "#fff" : "#666"} 
                />
                <Text style={[
                  styles.filterText,
                  filterPeriod === filter.id && styles.filterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Logs List */}
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Workout Logs</Text>
            <Text style={styles.emptyText}>Complete some workouts to see your history here!</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={({ item: log }) => (
              <Animated.View style={[styles.logCard, { opacity: fadeAnim }]}>
                <View style={styles.logHeader}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.logIcon}
                  >
                    <Ionicons name="fitness" size={20} color="#fff" />
                  </LinearGradient>
                  
                  <View style={styles.logInfo}>
                    <Text style={styles.logTitle}>{log.workoutType}</Text>
                    <Text style={styles.logDate}>
                      {new Date(log.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.logStats}>
                    <View style={styles.logStat}>
                      <Ionicons name="time" size={12} color="#666" />
                      <Text style={styles.logStatText}>{log.duration}min</Text>
                    </View>
                    <View style={styles.logStat}>
                      <Ionicons name="checkmark-circle" size={12} color="#666" />
                      <Text style={styles.logStatText}>
                        {log.completed_exercises}/{log.total_exercises}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {log.notes && (
                  <View style={styles.logNotes}>
                    <Text style={styles.logNotesText}>{log.notes}</Text>
                  </View>
                )}
              </Animated.View>
            )}
            keyExtractor={(item) => item.id.toString()}
            style={styles.logsList}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchWorkoutLogs}
          />
        )}
      </View>
    );
  };

  // Main render
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
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive]}
          onPress={() => setActiveTab('current')}
        >
          <Ionicons 
            name="fitness" 
            size={20} 
            color={activeTab === 'current' ? "#667eea" : "#999"} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'current' && styles.tabButtonTextActive
          ]}>
            Current Plan
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('logs')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'logs' ? "#667eea" : "#999"} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'logs' && styles.tabButtonTextActive
          ]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'current' ? <CurrentPlanTab /> : <WorkoutLogsTab />}

      {/* Exercise Modal */}
      <ExerciseModal />
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

  // Debug text
  debugText: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#f0f0f0',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  tabButtonTextActive: {
    color: '#667eea',
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },

  // Active Workout Header
  activeWorkoutHeader: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeWorkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activeWorkoutInfo: {
    flex: 1,
  },
  activeWorkoutTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeWorkoutTimer: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  endWorkoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endWorkoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Container
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    marginLeft: 16,
    marginRight: 4,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
  },

  // Plan Container
  planContainer: {
    padding: 16,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Week Container
  weekContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekContent: {
    padding: 16,
    paddingTop: 0,
  },

  // Day Container
  dayContainer: {
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayProgress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startWorkoutButton: {
    backgroundColor: '#4CAF50',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Exercises List
  exercisesList: {
    paddingLeft: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseCompleted: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  exerciseCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCheckboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Filter Container
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Logs List
  logsList: {
    flex: 1,
    padding: 16,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logStats: {
    gap: 8,
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatText: {
    fontSize: 12,
    color: '#666',
  },
  logNotes: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  logNotesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: width * 0.9,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  exerciseMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalActions: {
    alignItems: 'center',
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  completedButton: {
    backgroundColor: '#f44336',
  },
  incompleteButton: {
    backgroundColor: '#4CAF50',
  },
  completionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Retry button
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});