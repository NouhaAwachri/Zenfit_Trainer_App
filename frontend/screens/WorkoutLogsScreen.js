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
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  
  // Workout session state
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
    
    // ✅ Update local state immediately for instant checkbox/green background feedback
    setCurrentPlan(prevPlan => {
      if (!prevPlan || !prevPlan.plan) return prevPlan;
      
      const updatedPlan = { ...prevPlan };
      const newPlan = { ...updatedPlan.plan };
      
      // Find and update the specific exercise
      Object.keys(newPlan).forEach(weekKey => {
        Object.keys(newPlan[weekKey]).forEach(dayKey => {
          if (newPlan[weekKey][dayKey].exercises) {
            newPlan[weekKey][dayKey] = {
              ...newPlan[weekKey][dayKey],
              exercises: newPlan[weekKey][dayKey].exercises.map(ex => 
                ex.id === exerciseId 
                  ? { ...ex, completed: completed }
                  : ex
              )
            };
          }
        });
      });
      
      updatedPlan.plan = newPlan;
      return updatedPlan;
    });

    // Also update the selected exercise if it's the one being toggled
    setSelectedExercise(prev => 
      prev && prev.id === exerciseId 
        ? { ...prev, completed: completed }
        : prev
    );

    // ✅ Refresh workout progress so progress stats & animations update instantly
    fetchWorkoutProgress();

    // Show immediate feedback
    if (completed) {
      Alert.alert('✅ Exercise Completed!', 'Great job! Keep it up!', [{ text: 'OK' }]);
    }

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

  // Load data on component mount
  useEffect(() => {
    fetchCurrentPlan();
    fetchWorkoutProgress();
  }, [user]);

  // Animation effects
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPlan]);

  // Progress stats for current plan
  const getProgressStats = () => {
    if (!workoutProgress) {
      // Fallback stats from current plan if progress isn't available
      const completion = currentPlan?.completion_percentage || 0;
      return [
        {
          id: 'completion',
          label: 'Overall Progress',
          value: `${Math.round(completion)}%`,
          icon: 'trophy',
          gradient: ['#667eea', '#764ba2'],
          description: 'Program completion'
        },
        {
          id: 'workouts',
          label: 'Workouts Done',
          value: '0',
          icon: 'fitness',
          gradient: ['#f093fb', '#f5576c'],
          description: 'Total sessions'
        },
        {
          id: 'streak',
          label: 'Current Streak',
          value: '0d',
          icon: 'flame',
          gradient: ['#4facfe', '#00f2fe'],
          description: 'Keep it up!'
        },
        {
          id: 'time',
          label: 'Time Invested',
          value: '0h',
          icon: 'time',
          gradient: ['#43e97b', '#38f9d7'],
          description: 'Total workout time'
        },
      ];
    }
    
    return [
      {
        id: 'completion',
        label: 'Overall Progress',
        value: `${Math.round(workoutProgress.completion_percentage || 0)}%`,
        icon: 'trophy',
        gradient: ['#667eea', '#764ba2'],
        description: 'Program completion'
      },
      {
        id: 'workouts',
        label: 'Workouts Done',
        value: (workoutProgress.total_workouts || 0).toString(),
        icon: 'fitness',
        gradient: ['#f093fb', '#f5576c'],
        description: 'Total sessions'
      },
      {
        id: 'streak',
        label: 'Current Streak',
        value: `${workoutProgress.current_streak || 0}d`,
        icon: 'flame',
        gradient: ['#4facfe', '#00f2fe'],
        description: 'Keep it up!'
      },
      {
        id: 'time',
        label: 'Time Invested',
        value: `${Math.round((workoutProgress.total_time || 0) / 60)}h`,
        icon: 'time',
        gradient: ['#43e97b', '#38f9d7'],
        description: 'Total workout time'
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
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
            <TouchableOpacity 
              onPress={() => setShowExerciseModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.exerciseDetailsGrid}>
            <View style={styles.exerciseMetricCard}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.metricIconContainer}>
                <Ionicons name="barbell" size={20} color="#fff" />
              </LinearGradient>
              <Text style={styles.metricLabel}>Sets</Text>
              <Text style={styles.metricValue}>{selectedExercise?.sets}</Text>
            </View>
            <View style={styles.exerciseMetricCard}>
              <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.metricIconContainer}>
                <Ionicons name="refresh" size={20} color="#fff" />
              </LinearGradient>
              <Text style={styles.metricLabel}>Reps</Text>
              <Text style={styles.metricValue}>{selectedExercise?.reps}</Text>
            </View>
            <View style={styles.exerciseMetricCard}>
              <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.metricIconContainer}>
                <Ionicons name="timer" size={20} color="#fff" />
              </LinearGradient>
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
    const newCompletedState = !selectedExercise.completed;
    
    // Update UI immediately
    setSelectedExercise(prev => ({ ...prev, completed: newCompletedState }));
    
    const success = await toggleExerciseCompletion(
      selectedExercise.id,
      newCompletedState
    );
    
    if (success) {
      // Keep modal open to show the updated state, or close after a brief delay
      setTimeout(() => {
        setShowExerciseModal(false);
      }, 1000); // Close after 1 second to show the success state
    } else {
      // Revert the UI change if the request failed
      setSelectedExercise(prev => ({ ...prev, completed: !newCompletedState }));
    }
  }}
>
              <Ionicons 
                name={selectedExercise?.completed ? "checkmark-circle" : "add-circle"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.completionButtonText}>
                {selectedExercise?.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // Main Content Component
  const MainContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading your workout plan...</Text>
            <Text style={styles.loadingSubtext}>Getting everything ready for you</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
          <LinearGradient colors={['#ff9a9e', '#fecfef']} style={styles.errorIconContainer}>
            <Ionicons name="warning" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Oops! Something went wrong</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCurrentPlan}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.retryGradient}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (!currentPlan) {
      return (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
          <LinearGradient colors={['#a8edea', '#fed6e3']} style={styles.errorIconContainer}>
            <Ionicons name="fitness" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Ready to start your fitness journey?</Text>
          <Text style={styles.emptyText}>Generate your personalized workout plan and begin tracking your progress!</Text>
          <TouchableOpacity style={styles.retryButton}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.retryGradient}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Create Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const progressStats = getProgressStats();

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Active Workout Header */}
        {activeWorkout && (
          <Animated.View style={[styles.activeWorkoutHeader, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.activeWorkoutGradient}
            >
              <View style={styles.activeWorkoutInfo}>
                <Text style={styles.activeWorkoutTitle}>
                  🔥 Week {activeWorkout.week}, Day {activeWorkout.day}
                </Text>
                <Text style={styles.activeWorkoutTimer}>{formatTime(workoutTimer)}</Text>
                <Text style={styles.activeWorkoutSubtitle}>Keep pushing! You're doing great!</Text>
              </View>
              <TouchableOpacity
                style={styles.endWorkoutButton}
                onPress={() => endWorkoutSession()}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.endWorkoutText}>Finish</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Motivational Header */}
        <Animated.View style={[styles.motivationalHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.motivationalGradient}>
            <Text style={styles.motivationalText}>
              {activeWorkout ? "💪 Workout in Progress!" : "🚀 Ready to crush your goals?"}
            </Text>
            <Text style={styles.motivationalSubtext}>
              {currentPlan?.program_name || "Your Fitness Journey"}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Progress Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statsTitle}>Your Progress</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
            {progressStats.map((stat, index) => (
              <Animated.View 
                key={stat.id} 
                style={[
                  styles.statCard,
                  { 
                    opacity: fadeAnim,
                    transform: [{ 
                      translateX: Animated.add(slideAnim, new Animated.Value(index * 10)) 
                    }] 
                  }
                ]}
              >
                <LinearGradient colors={stat.gradient} style={styles.statCardGradient}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon} size={28} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statDescription}>{stat.description}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Enhanced Workout Plan */}
        <Animated.View style={[styles.planContainer, { opacity: fadeAnim }]}>
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>Your Workout Plan</Text>
            <Text style={styles.planSubtitle}>Tap exercises to track your progress</Text>
          </View>
          
          {Object.entries(currentPlan.plan || {}).map(([weekKey, weekData], weekIndex) => {
            const weekNum = weekKey.replace('Week ', '');
            const isWeekExpanded = expandedWeek === weekKey;
            
            // Calculate week progress
            const weekExercises = Object.values(weekData || {}).flatMap(day => day.exercises || []);
            const weekCompletedExercises = weekExercises.filter(ex => ex.completed).length;
            const weekProgress = weekExercises.length > 0 ? (weekCompletedExercises / weekExercises.length) * 100 : 0;
            
            return (
              <Animated.View 
                key={weekKey} 
                style={[
                  styles.weekContainer,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(weekIndex * 5)) }]
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.weekHeader}
                  onPress={() => setExpandedWeek(isWeekExpanded ? null : weekKey)}
                >
                  <View style={styles.weekHeaderLeft}>
                    <LinearGradient
                      colors={weekProgress > 75 ? ['#4CAF50', '#45a049'] : ['#667eea', '#764ba2']}
                      style={styles.weekProgressIcon}
                    >
                      <Text style={styles.weekProgressText}>{Math.round(weekProgress)}%</Text>
                    </LinearGradient>
                    <View>
                      <Text style={styles.weekTitle}>{weekKey}</Text>
                      <Text style={styles.weekProgress}>
                        {weekCompletedExercises}/{weekExercises.length} exercises completed
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name={isWeekExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {isWeekExpanded && (
                  <View style={styles.weekContent}>
                    {Object.entries(weekData || {}).map(([dayKey, dayData], dayIndex) => {
                      const dayNum = dayKey.replace('Day ', '');
                      const isDayExpanded = expandedDay === `${weekKey}-${dayKey}`;
                      const exercises = dayData?.exercises || [];
                      const completedExercises = exercises.filter(ex => ex.completed).length;
                      const totalExercises = exercises.length;
                      const dayProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
                      
                      return (
                        <Animated.View 
                          key={dayKey} 
                          style={[
                            styles.dayContainer,
                            { 
                              opacity: fadeAnim,
                              transform: [{ translateX: Animated.add(slideAnim, new Animated.Value(dayIndex * 3)) }]
                            }
                          ]}
                        >
                          <TouchableOpacity
                            style={[styles.dayHeader, dayProgress === 100 && styles.dayHeaderCompleted]}
                            onPress={() => setExpandedDay(isDayExpanded ? null : `${weekKey}-${dayKey}`)}
                          >
                            <View style={styles.dayHeaderLeft}>
                              <LinearGradient
                                colors={dayProgress === 100 ? ['#4CAF50', '#45a049'] : ['#667eea', '#764ba2']}
                                style={styles.dayIcon}
                              >
                                <Ionicons 
                                  name={dayProgress === 100 ? "checkmark-circle" : "fitness"} 
                                  size={18} 
                                  color="#fff" 
                                />
                              </LinearGradient>
                              <View style={styles.dayInfo}>
                                <Text style={styles.dayTitle}>{dayData?.label || `Day ${dayNum}`}</Text>
                                <Text style={styles.dayProgress}>
                                  {completedExercises}/{totalExercises} completed • {exercises.length} exercises
                                </Text>
                                {dayProgress === 100 && (
                                  <Text style={styles.dayCompletedText}>🎉 Completed!</Text>
                                )}
                              </View>
                            </View>
                            
                            <View style={styles.dayHeaderRight}>
                              {!activeWorkout && dayProgress < 100 && (
                                <TouchableOpacity
                                  style={styles.startWorkoutButton}
                                  onPress={() => startWorkoutSession(weekNum, dayNum, dayData)}
                                >
                                  <Ionicons name="play" size={14} color="#fff" />
                                  <Text style={styles.startWorkoutText}>Start</Text>
                                </TouchableOpacity>
                              )}
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
  onPress={async () => {
    const newCompletedState = !exercise.completed;
    
    // Call the toggle function (which now updates state immediately)
    await toggleExerciseCompletion(exercise.id, newCompletedState);
  }}
>
  {exercise.completed && (
    <Ionicons name="checkmark" size={14} color="#fff" />
  )}
</TouchableOpacity>
                                    <View style={styles.exerciseInfo}>
                                      <Text style={[
                                        styles.exerciseName,
                                        exercise.completed && styles.exerciseNameCompleted
                                      ]}>
                                        {exercise.name}
                                      </Text>
                                      <View style={styles.exerciseMetrics}>
                                        <View style={styles.exerciseMetric}>
                                          <Ionicons name="barbell" size={12} color="#666" />
                                          <Text style={styles.exerciseMetricText}>{exercise.sets} sets</Text>
                                        </View>
                                        <View style={styles.exerciseMetric}>
                                          <Ionicons name="refresh" size={12} color="#666" />
                                          <Text style={styles.exerciseMetricText}>{exercise.reps} reps</Text>
                                        </View>
                                      </View>
                                    </View>
                                  </View>
                                  
                                  <View style={styles.exerciseItemRight}>
                                    {exercise.completed && (
                                      <View style={styles.completedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                      </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={16} color="#999" />
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </Animated.View>
                          )}
                        </Animated.View>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>
    );
  };

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Enhanced Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Workouts</Text>
          <Text style={styles.headerSubtitle}>
            {activeWorkout ? "Workout in progress..." : "Let's get stronger today! 💪"}
          </Text>
        </View>
        {!activeWorkout && (
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="trophy" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Main Content */}
      <MainContent />

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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },

  // Motivational Header
  motivationalHeader: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  motivationalGradient: {
    padding: 20,
    alignItems: 'center',
  },
  motivationalText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  motivationalSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },

  // Active Workout Header
  activeWorkoutHeader: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeWorkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  activeWorkoutInfo: {
    flex: 1,
  },
  activeWorkoutTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeWorkoutTimer: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  activeWorkoutSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 4,
  },
  endWorkoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  endWorkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Stats Container
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginBottom: 16,
  },
  statsScrollContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  statCard: {
    marginRight: 12,
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
    paddingVertical: 20,
    alignItems: 'center',
    minWidth: 120,
    minHeight: 140,
    justifyContent: 'center',
  },
  statIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  statDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textAlign: 'center',
  },

  // Enhanced Plan Container
  planContainer: {
    padding: 16,
  },
  planHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Enhanced Week Container
  weekContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  weekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  weekProgressIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  weekProgress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  weekContent: {
    padding: 16,
  },

  // Enhanced Day Container
  dayContainer: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayHeaderCompleted: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  dayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayProgress: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  dayCompletedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startWorkoutButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startWorkoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Enhanced Exercises List
  exercisesList: {
    paddingLeft: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  exerciseCompleted: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  exerciseCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  exerciseMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  exerciseMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseMetricText: {
    fontSize: 13,
    color: '#666',
  },
  exerciseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    padding: 4,
  },

  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    margin: 20,
    maxWidth: width * 0.9,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  exerciseDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
  },
  exerciseMetricCard: {
    alignItems: 'center',
    flex: 1,
  },
  metricIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalActions: {
    alignItems: 'center',
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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

  // Enhanced Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingSpinner: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  // Enhanced Retry button
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});