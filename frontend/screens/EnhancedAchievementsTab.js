import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EnhancedAchievementsTab = ({ dashboardData, fadeAnim, slideAnim }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showNewAchievementAnimation, setShowNewAchievementAnimation] = useState(false);
  
  // Animation refs
  const modalAnim = useRef(new Animated.Value(0)).current;
  const newAchievementAnim = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef({}).current;

  const achievements = dashboardData?.achievements || [];
  
  // Enhanced mock achievements with more data
  const enhancedAchievements = achievements.map((achievement, index) => ({
    ...achievement,
    id: index,
    rarity: getRarity(achievement),
    points: getPoints(achievement),
    progress: getProgress(achievement),
    isNew: index === 0, // Mark first as new for demo
    unlockedAt: achievement.category !== 'future' ? new Date().toISOString() : null,
  }));

  // Add some locked achievements for demo
  const allAchievements = [
    ...enhancedAchievements,
    {
      id: 'future1',
      title: 'Century Club',
      description: 'Complete 100 total workouts',
      icon: '💯',
      category: 'milestones',
      rarity: 'legendary',
      points: 1000,
      progress: 75,
      isNew: false,
      unlockedAt: null,
    },
    {
      id: 'future2',
      title: 'Early Bird',
      description: 'Complete 10 morning workouts',
      icon: '🌅',
      category: 'habits',
      rarity: 'rare',
      points: 150,
      progress: 30,
      isNew: false,
      unlockedAt: null,
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: 'star' },
    { id: 'milestones', name: 'Milestones', icon: 'trophy' },
    { id: 'consistency', name: 'Streaks', icon: 'flame' },
    { id: 'performance', name: 'Performance', icon: 'target' },
    { id: 'time', name: 'Time', icon: 'time' },
    { id: 'habits', name: 'Habits', icon: 'calendar' }
  ];

  function getRarity(achievement) {
    if (achievement.title.includes('Champion') || achievement.title.includes('Master')) return 'legendary';
    if (achievement.title.includes('Warrior') || achievement.title.includes('Perfectionist')) return 'epic';
    if (achievement.title.includes('Week') || achievement.title.includes('Achiever')) return 'rare';
    return 'common';
  }

  function getPoints(achievement) {
    const rarity = getRarity(achievement);
    switch (rarity) {
      case 'legendary': return 500;
      case 'epic': return 300;
      case 'rare': return 150;
      default: return 100;
    }
  }

  function getProgress(achievement) {
    // Return 100 for unlocked achievements, random for locked ones
    return achievement.category !== 'future' ? 100 : Math.floor(Math.random() * 80) + 20;
  }

  const rarityColors = {
    common: ['#94a3b8', '#64748b'],
    rare: ['#3b82f6', '#1d4ed8'],
    epic: ['#8b5cf6', '#7c3aed'],
    legendary: ['#f59e0b', '#d97706']
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : allAchievements.filter(a => a.category === selectedCategory);

  const unlockedCount = allAchievements.filter(a => a.unlockedAt).length;
  const totalPoints = allAchievements
    .filter(a => a.unlockedAt)
    .reduce((sum, a) => sum + a.points, 0);

  useEffect(() => {
    // Animate progress bars
    filteredAchievements.forEach((achievement) => {
      if (!progressAnims[achievement.id]) {
        progressAnims[achievement.id] = new Animated.Value(0);
      }
      
      Animated.timing(progressAnims[achievement.id], {
        toValue: achievement.progress / 100,
        duration: 1000,
        delay: achievement.id * 100,
        useNativeDriver: false,
      }).start();
    });

    // Check for new achievements
    const newAchievements = allAchievements.filter(a => a.isNew);
    if (newAchievements.length > 0) {
      setShowNewAchievementAnimation(true);
      Animated.sequence([
        Animated.timing(newAchievementAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(newAchievementAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start(() => setShowNewAchievementAnimation(false));
    }
  }, [filteredAchievements]);

  const openAchievementModal = (achievement) => {
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeAchievementModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAchievementModal(false);
      setSelectedAchievement(null);
    });
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.id ? '#fff' : '#667eea'} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.categoryButtonTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStatsOverview = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsCard}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statGradient}>
          <Text style={styles.statValue}>{unlockedCount}/{allAchievements.length}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </LinearGradient>
      </View>
      
      <View style={styles.statsCard}>
        <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.statGradient}>
          <Text style={styles.statValue}>{totalPoints.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </LinearGradient>
      </View>
      
      <View style={styles.statsCard}>
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.statGradient}>
          <Text style={styles.statValue}>{Math.round((unlockedCount / allAchievements.length) * 100)}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </LinearGradient>
      </View>
    </View>
  );

  const renderAchievementCard = (achievement) => {
    const isUnlocked = achievement.unlockedAt !== null;
    const colors = rarityColors[achievement.rarity];
    
    if (!progressAnims[achievement.id]) {
      progressAnims[achievement.id] = new Animated.Value(achievement.progress / 100);
    }

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[styles.achievementCard, !isUnlocked && styles.achievementCardLocked]}
        onPress={() => openAchievementModal(achievement)}
        activeOpacity={0.8}
      >
        {achievement.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW!</Text>
          </View>
        )}

        <LinearGradient
          colors={isUnlocked ? colors : ['#f8f9fa', '#e9ecef']}
          style={styles.achievementGradient}
        >
          <View style={styles.achievementHeader}>
            <View style={[styles.achievementIconContainer, !isUnlocked && styles.achievementIconLocked]}>
              <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
            </View>
            
            {isUnlocked && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{achievement.points}pts</Text>
              </View>
            )}
          </View>

          <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementTitleLocked]}>
            {achievement.title}
          </Text>
          
          <Text style={[styles.achievementDescription, !isUnlocked && styles.achievementDescriptionLocked]}>
            {achievement.description}
          </Text>

          <View style={styles.rarityBadge}>
            <Text style={[styles.rarityText, !isUnlocked && styles.rarityTextLocked]}>
              {achievement.rarity.toUpperCase()}
            </Text>
          </View>

          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{achievement.progress}%</Text>
              </View>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnims[achievement.id].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      })
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {isUnlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderAchievementModal = () => (
    <Modal
      visible={showAchievementModal}
      transparent={true}
      animationType="none"
      onRequestClose={closeAchievementModal}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: modalAnim,
              transform: [{
                scale: modalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })
              }]
            }
          ]}
        >
          {selectedAchievement && (
            <>
              <LinearGradient
                colors={rarityColors[selectedAchievement.rarity]}
                style={styles.modalHeader}
              >
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeAchievementModal}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalEmoji}>{selectedAchievement.icon}</Text>
                </View>
                
                <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
                <Text style={styles.modalRarity}>{selectedAchievement.rarity.toUpperCase()}</Text>
              </LinearGradient>

              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>{selectedAchievement.description}</Text>
                
                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Category</Text>
                    <Text style={styles.modalStatValue}>{selectedAchievement.category}</Text>
                  </View>
                  
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Points</Text>
                    <Text style={styles.modalStatValue}>{selectedAchievement.points}</Text>
                  </View>
                  
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Progress</Text>
                    <Text style={styles.modalStatValue}>{selectedAchievement.progress}%</Text>
                  </View>
                </View>

                {selectedAchievement.unlockedAt && (
                  <View style={styles.modalUnlockedContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.modalUnlockedText}>
                      Unlocked on {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  const renderNewAchievementNotification = () => (
    showNewAchievementAnimation && (
      <Animated.View 
        style={[
          styles.newAchievementNotification,
          {
            opacity: newAchievementAnim,
            transform: [{
              translateY: newAchievementAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              })
            }]
          }
        ]}
      >
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.newAchievementGradient}>
          <Ionicons name="trophy" size={24} color="#fff" />
          <View style={styles.newAchievementTextContainer}>
            <Text style={styles.newAchievementTitle}>New Achievement!</Text>
            <Text style={styles.newAchievementText}>You've unlocked a new milestone!</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    )
  );

  if (allAchievements.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="trophy-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateText}>Keep working out to unlock achievements!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderNewAchievementNotification()}
      
      <Text style={styles.sectionTitle}>🏆 Your Achievements</Text>
      
      {renderStatsOverview()}
      {renderCategoryFilter()}
      
      <ScrollView style={styles.achievementsList} showsVerticalScrollIndicator={false}>
        <View style={styles.achievementsGrid}>
          {filteredAchievements.map(renderAchievementCard)}
        </View>
        
        {/* Almost There Section */}
        {allAchievements.filter(a => !a.unlockedAt && a.progress >= 70).length > 0 && (
          <View style={styles.almostThereContainer}>
            <Text style={styles.almostThereTitle}>⭐ Almost There!</Text>
            <View style={styles.almostThereGrid}>
              {allAchievements
                .filter(a => !a.unlockedAt && a.progress >= 70)
                .slice(0, 3)
                .map(achievement => (
                  <TouchableOpacity
                    key={achievement.id}
                    style={styles.almostThereCard}
                    onPress={() => openAchievementModal(achievement)}
                  >
                    <Text style={styles.almostThereEmoji}>{achievement.icon}</Text>
                    <Text style={styles.almostThereCardTitle}>{achievement.title}</Text>
                    <Text style={styles.almostThereProgress}>{achievement.progress}% complete</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {renderAchievementModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Stats Overview
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Category Filter
  categoryContainer: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    paddingLeft: 0,
    paddingRight: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#667eea',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },

  // Achievement Cards
  achievementsList: {
    flex: 1,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: (width - 44) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  achievementGradient: {
    padding: 16,
    minHeight: 180,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIconLocked: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  achievementEmoji: {
    fontSize: 24,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  achievementTitleLocked: {
    color: '#666',
  },
  achievementDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  achievementDescriptionLocked: {
    color: '#999',
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rarityTextLocked: {
    color: '#999',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Progress Bar
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#999',
    fontSize: 12,
  },
  progressPercentage: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  unlockedDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 8,
  },

  // Almost There Section
  almostThereContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  almostThereTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  almostThereGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  almostThereCard: {
    width: (width - 60) / 3,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  almostThereEmoji: {
    fontSize: 20,
    marginBottom: 6,
    opacity: 0.6,
  },
  almostThereCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  almostThereProgress: {
    fontSize: 10,
    color: '#999',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 350,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalRarity: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  modalUnlockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalUnlockedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },

  // New Achievement Notification
  newAchievementNotification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  newAchievementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  newAchievementTextContainer: {
    flex: 1,
  },
  newAchievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  newAchievementText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default EnhancedAchievementsTab;