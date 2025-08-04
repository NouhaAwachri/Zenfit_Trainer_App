import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function CoachAIScreen({ navigation, user }) {
  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
  
  // Coach specialization options
  const coachTypes = [
    {
      id: 'fitness',
      name: 'Fitness Coach',
      description: 'form corrections, motivation',
      icon: 'fitness',
      gradient: ['#667eea', '#764ba2'],
    },


    {
      id: 'wellness',
      name: 'Wellness Coach',
      description: 'Mental health, sleep, stress management',
      icon: 'heart',
      gradient: ['#4facfe', '#00f2fe'],
    },
   

  ];

  // Quick action suggestions
  const quickActions = [
    { id: 'motivation', text: 'I need motivation today', icon: 'flame' },
    { id: 'workout_advice', text: 'Help with my workout', icon: 'barbell' },
    { id: 'goal_setting', text: 'Set new goals', icon: 'trophy' },
    { id: 'progress_check', text: 'Check my progress', icon: 'trending-up' },
    { id: 'habit_building', text: 'Build better habits', icon: 'checkmark-circle' },
  ];

  const [selectedCoachType, setSelectedCoachType] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [coachPersonality, setCoachPersonality] = useState('supportive'); // supportive, motivational, analytical
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  // Initialize welcome message based on coach type
  useEffect(() => {
    if (selectedCoachType && chatHistory.length === 0) {
      const welcomeMessages = {
        fitness: `🏋️ Hey ${username}! I'm your AI Fitness Coach. I'm here to help you crush your fitness goals, perfect your form, and keep you motivated every step of the way. What would you like to work on today?`,
        wellness: `🧘 Hi ${username}! I'm your AI Wellness Coach. I focus on your mental health, sleep quality, and stress management. Let's work together to create a balanced, healthy lifestyle. What aspect of wellness would you like to explore?`,
      };

      setChatHistory([{
        type: 'ai',
        text: welcomeMessages[selectedCoachType.id] || "Hi! I'm your AI Coach. How can I help you today?",
        timestamp: new Date(),
      }]);

      // Auto-scroll to bottom after welcome message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [selectedCoachType, username]);

  // Animation for coach selection
  useEffect(() => {
    if (!selectedCoachType) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedCoachType]);

  // Load chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`http://192.168.1.8:5000/coach/history/${user?.uid}`);
        const data = await res.json();
        setConversations(data);
      } catch (e) {
        console.error("Failed to fetch coach chat history:", e);
      }
    };
    fetchChatHistory();
  }, []);

  const selectCoachType = (coach) => {
    setSelectedCoachType(coach);
    setChatHistory([]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || loading) return;

    const userMessage = {
      type: 'user',
      text: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      setLoading(true);
      const response = await fetch('http://192.168.1.8:5000/generate/history/${user?.uid}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user?.uid,
          message: chatInput.trim(),
          coach_type: selectedCoachType.id,
          personality: coachPersonality,
          chat_history: chatHistory,
        }),
      });

      const data = await response.json();
      
      setTimeout(() => {
        setIsTyping(false);
        const aiMessage = {
          type: 'ai',
          text: data.response || '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };

        setChatHistory(prev => [...prev, aiMessage]);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 1000); // Simulate thinking time

    } catch (error) {
      console.error('Coach chat error:', error);
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        type: 'ai',
        text: '❌ Connection error. Please check your internet and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    setChatInput(action.text);
    textInputRef.current?.focus();
  };

  const resetChat = () => {
    Alert.alert(
      'New Session',
      'Start a new coaching session? Your current conversation will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start New', 
          onPress: () => {
            setSelectedCoachType(null);
            setChatHistory([]);
            setChatInput('');
            setShowHistory(false);
          }
        },
      ]
    );
  };

  const changePersonality = () => {
    const personalities = ['supportive', 'motivational', 'analytical'];
    const currentIndex = personalities.indexOf(coachPersonality);
    const nextPersonality = personalities[(currentIndex + 1) % personalities.length];
    setCoachPersonality(nextPersonality);
    
    const personalityNames = {
      supportive: 'Supportive & Empathetic',
      motivational: 'High-Energy & Motivational',
      analytical: 'Data-Driven & Analytical',
    };

    Alert.alert('Coach Personality Changed', `Your coach is now ${personalityNames[nextPersonality]}`);
  };

  const renderCoachSelection = () => (
    <Animated.View
      style={[
        styles.coachSelectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeIconContainer}>
          <Ionicons name="chatbubbles" size={48} color="#6C63FF" />
        </View>
        <Text style={styles.welcomeTitle}>Choose Your AI Coach</Text>
        <Text style={styles.welcomeSubtitle}>
          Select the type of coaching that matches your goals. Each coach specializes in different areas to provide you with the most relevant guidance.
        </Text>
      </View>

      <View style={styles.coachTypesGrid}>
        {coachTypes.map((coach) => (
          <TouchableOpacity
            key={coach.id}
            style={styles.coachTypeCard}
            onPress={() => selectCoachType(coach)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={coach.gradient}
              style={styles.coachTypeGradient}
            >
              <View style={styles.coachTypeIcon}>
                <Ionicons name={coach.icon} size={32} color="#fff" />
              </View>
              <Text style={styles.coachTypeName}>{coach.name}</Text>
              <Text style={styles.coachTypeDescription}>{coach.description}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderChatMessage = ({ item, index }) => {
    if (item.type === 'typing' || isTyping && index === chatHistory.length - 1) {
      return (
        <View style={styles.typingContainer}>
          <View style={styles.aiAvatar}>
            <Ionicons name={selectedCoachType?.icon || "chatbubble"} size={16} color="#fff" />
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#6C63FF" />
            <Text style={styles.typingText}>Coach is thinking...</Text>
          </View>
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          item.type === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
        ]}
      >
        {item.type === 'ai' && (
          <LinearGradient
            colors={selectedCoachType?.gradient || ['#6C63FF', '#9C63FF']}
            style={styles.aiAvatar}
          >
            <Ionicons name={selectedCoachType?.icon || "chatbubble"} size={16} color="#fff" />
          </LinearGradient>
        )}
        <View
          style={[
            styles.messageBubble,
            item.type === 'user' ? styles.userBubble : styles.aiBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            item.type === 'user' ? styles.userMessageText : styles.aiMessageText
          ]}>
            {item.text}
          </Text>
          {item.timestamp && (
            <Text style={styles.messageTimestamp}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        {item.type === 'user' && (
          <LinearGradient
            colors={['#333', '#666']}
            style={styles.userAvatar}
          >
            <Ionicons name="person" size={16} color="#fff" />
          </LinearGradient>
        )}
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action)}
            activeOpacity={0.8}
          >
            <Ionicons name={action.icon} size={16} color="#6C63FF" />
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {selectedCoachType ? selectedCoachType.name : 'AI Coach'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {selectedCoachType ? `${coachPersonality.charAt(0).toUpperCase() + coachPersonality.slice(1)} Mode` : 'Personal AI Assistant'}
          </Text>
        </View>
        {selectedCoachType && (
          <TouchableOpacity 
            style={styles.personalityButton}
            onPress={changePersonality}
          >
            <Ionicons name="settings" size={24} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Ionicons name="person-circle" size={32} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {!selectedCoachType ? (
          renderCoachSelection()
        ) : (
          <View style={styles.chatContainer}>
            {/* Coach Info Bar */}
            <LinearGradient
              colors={[...selectedCoachType.gradient, 'rgba(255,255,255,0.1)']}
              style={styles.coachInfoBar}
            >
              <View style={styles.coachInfo}>
                <Ionicons name={selectedCoachType.icon} size={24} color="#fff" />
                <View style={styles.coachInfoText}>
                  <Text style={styles.coachInfoName}>{selectedCoachType.name}</Text>
                  <Text style={styles.coachInfoStatus}>Online • Ready to help</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetChat}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Quick Actions */}
            {chatHistory.length <= 1 && renderQuickActions()}

            {/* Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={isTyping ? [...chatHistory, { type: 'typing' }] : chatHistory}
              renderItem={renderChatMessage}
              keyExtractor={(item, index) => `${item.type}-${index}`}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />

            {/* Chat Input */}
            <View style={styles.chatInputContainer}>
              <TextInput
                ref={textInputRef}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={`Ask your ${selectedCoachType.name.toLowerCase()}...`}
                placeholderTextColor="#999"
                style={styles.chatInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!chatInput.trim() || loading) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!chatInput.trim() || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedCoachType.gradient}
                  style={styles.sendButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  personalityButton: {
    marginRight: 12,
  },
  profileButton: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  
  // Coach Selection Styles
  coachSelectionContainer: {
    flex: 1,
    padding: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  coachTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  coachTypeCard: {
    width: (width - 64) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  coachTypeGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  coachTypeIcon: {
    marginBottom: 12,
  },
  coachTypeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  coachTypeDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Chat Container Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  coachInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachInfoText: {
    marginLeft: 12,
  },
  coachInfoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  coachInfoStatus: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Quick Actions Styles
  quickActionsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsScroll: {
    flexDirection: 'row',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    marginRight: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0f0',
  },
  quickActionText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Chat Messages Styles
  chatMessages: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatMessagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  
  // Typing Indicator Styles
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Chat Input Styles
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});