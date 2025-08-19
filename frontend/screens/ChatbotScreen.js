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
      description: 'Workouts, form corrections & motivation',
      icon: 'fitness',
      gradient: ['#FF6B6B', '#FF8E53'],
      darkGradient: ['#E55A5A', '#E57C4A'],
    },
    {
      id: 'wellness',
      name: 'Wellness Coach', 
      description: 'Mental health, sleep & stress management',
      icon: 'heart',
      gradient: ['#4ECDC4', '#44A08D'],
      darkGradient: ['#45B7B8', '#3D8B82'],
    },
  ];

  // Enhanced quick actions
  const quickActions = [
    { id: 'start', text: 'Let\'s get started!', icon: 'rocket-outline' },
    { id: 'goals', text: 'Set my goals', icon: 'trophy-outline' },
    { id: 'motivation', text: 'Motivate me today', icon: 'flame-outline' },
    { id: 'progress', text: 'Check progress', icon: 'trending-up-outline' },
    { id: 'advice', text: 'Need advice', icon: 'bulb-outline' },
  ];

  const [selectedCoachType, setSelectedCoachType] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  // Animation for entrance
  useEffect(() => {
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

  // Initialize welcome message
  useEffect(() => {
    if (selectedCoachType && chatHistory.length === 0) {
      const welcomeMessages = {
        fitness: `🏋️ Hey ${username}! I'm your AI Fitness Coach. Ready to crush your fitness goals together? What would you like to work on today?`,
        wellness: `🧘 Hi ${username}! I'm your AI Wellness Coach. I'm here to help you find balance, improve your mental health, and manage stress. How can I support you today?`,
      };

      setTimeout(() => {
        setChatHistory([{
          type: 'ai',
          text: welcomeMessages[selectedCoachType.id],
          timestamp: new Date(),
        }]);
      }, 800);
    }
  }, [selectedCoachType, username]);

  const selectCoachType = (coach) => {
    setSelectedCoachType(coach);
    setChatHistory([]);
    setShowQuickActions(true);
  };

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || chatInput.trim();
    if (!message || loading) return;

    const userMessage = {
      type: 'user',
      text: message,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);
    setShowQuickActions(false);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setLoading(true);
      const response = await fetch(`http://192.168.1.10:5000/generate/history/${user?.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user?.uid,
          message: message,
          coach_type: selectedCoachType.id,
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
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }, 1500);

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
    handleSendMessage(action.text);
  };

  const resetChat = () => {
    Alert.alert(
      '🔄 New Chat Session',
      'Start a fresh conversation? Your current chat will be saved to history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start New', 
          onPress: () => {
            setSelectedCoachType(null);
            setChatHistory([]);
            setChatInput('');
            setShowQuickActions(true);
          }
        },
      ]
    );
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
      {/* Enhanced Welcome Section */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.welcomeHeader}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeIconContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.welcomeIconGradient}
            >
              <Ionicons name="chatbubbles" size={40} color="white" />
            </LinearGradient>
          </View>
          <Text style={styles.welcomeTitle}>Choose Your AI Coach</Text>
          <Text style={styles.welcomeSubtitle}>
            Select your specialized coach and start your personalized journey toward your goals
          </Text>
        </View>
      </LinearGradient>

      {/* Improved Coach Cards */}
      <View style={styles.coachCardsContainer}>
        {coachTypes.map((coach, index) => (
          <Animated.View
            key={coach.id}
            style={[
              styles.coachCardWrapper,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 30],
                    outputRange: [0, 30 + (index * 20)],
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.coachCard}
              onPress={() => selectCoachType(coach)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={coach.gradient}
                style={styles.coachCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Card Content */}
                <View style={styles.coachCardContent}>
                  <View style={styles.coachIconWrapper}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                      style={styles.coachIconBg}
                    >
                      <Ionicons name={coach.icon} size={32} color="white" />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.coachInfo}>
                    <Text style={styles.coachName}>{coach.name}</Text>
                    <Text style={styles.coachDescription}>{coach.description}</Text>
                  </View>

                  <View style={styles.selectArrow}>
                    <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>

                {/* Subtle decorative elements */}
                <View style={styles.cardDecorations}>
                  <View style={[styles.decoration, styles.decoration1]} />
                  <View style={[styles.decoration, styles.decoration2]} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Footer with trust indicators */}
      <View style={styles.selectionFooter}>
        <View style={styles.trustIndicators}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color="#4ECDC4" />
            <Text style={styles.trustText}>Secure & Private</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="flash" size={16} color="#FF6B6B" />
            <Text style={styles.trustText}>Instant Responses</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderMessage = ({ item, index }) => {
    if (isTyping && index === chatHistory.length) {
      return (
        <View style={styles.typingMessageContainer}>
          <LinearGradient
            colors={selectedCoachType?.gradient || ['#667eea', '#764ba2']}
            style={styles.aiAvatar}
          >
            <Ionicons name={selectedCoachType?.icon || "chatbubble"} size={16} color="white" />
          </LinearGradient>
          <View style={styles.typingBubble}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, styles.dot1]} />
              <View style={[styles.typingDot, styles.dot2]} />
              <View style={[styles.typingDot, styles.dot3]} />
            </View>
            <Text style={styles.typingText}>Coach is thinking...</Text>
          </View>
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          item.type === 'user' ? styles.userMessageContainer : styles.aiMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* AI Avatar */}
        {item.type === 'ai' && (
          <LinearGradient
            colors={selectedCoachType?.gradient || ['#667eea', '#764ba2']}
            style={styles.aiAvatar}
          >
            <Ionicons name={selectedCoachType?.icon || "chatbubble"} size={16} color="white" />
          </LinearGradient>
        )}
        
        {/* Message Bubble */}
        <View
          style={[
            styles.messageBubble,
            item.type === 'user' ? styles.userBubble : styles.aiBubble
          ]}
        >
          {item.type === 'user' && (
            <LinearGradient
              colors={selectedCoachType?.darkGradient || ['#667eea', '#764ba2']}
              style={styles.userBubbleGradient}
            >
              <Text style={styles.userMessageText}>{item.text}</Text>
              <Text style={styles.userTimestamp}>
                {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </LinearGradient>
          )}
          {item.type === 'ai' && (
            <>
              <Text style={styles.aiMessageText}>{item.text}</Text>
              <Text style={styles.aiTimestamp}>
                {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </>
          )}
        </View>

        {/* User Avatar */}
        {item.type === 'user' && (
          <LinearGradient
            colors={['#444', '#666']}
            style={styles.userAvatar}
          >
            <Ionicons name="person" size={16} color="white" />
          </LinearGradient>
        )}
      </Animated.View>
    );
  };

  const renderQuickActions = () => {
    if (!showQuickActions || chatHistory.length > 1) return null;

    return (
      <View style={styles.quickActionsSection}>
        <LinearGradient
          colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
          style={styles.quickActionsContainer}
        >
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScrollContent}
          >
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionButton}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedCoachType?.gradient || ['#667eea', '#764ba2']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name={action.icon} size={18} color="white" />
                  <Text style={styles.quickActionText}>{action.text}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Enhanced Header */}
      <LinearGradient 
        colors={selectedCoachType ? selectedCoachType.gradient : ['#667eea', '#764ba2']} 
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {selectedCoachType ? selectedCoachType.name : 'AI Coach'}
          </Text>
          <View style={styles.headerSubtitleContainer}>
            {selectedCoachType && <View style={styles.onlineIndicator} />}
            <Text style={styles.headerSubtitle}>
              {selectedCoachType ? 'Online • Ready to help' : 'Your Personal AI Assistant'}
            </Text>
          </View>
        </View>

        {selectedCoachType && (
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={resetChat}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.newChatButtonGradient}
            >
              <Ionicons name="add" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {!selectedCoachType ? (
          renderCoachSelection()
        ) : (
          <View style={styles.chatContainer}>
            {/* Quick Actions */}
            {renderQuickActions()}

            {/* Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={chatHistory}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `${item.type}-${index}`}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={isTyping ? renderMessage({ item: { type: 'typing' }, index: chatHistory.length }) : null}
            />

            {/* Enhanced Input Container */}
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(248,249,250,0.95)']}
              style={styles.inputContainer}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder={`Message your ${selectedCoachType.name.toLowerCase()}...`}
                  placeholderTextColor="#999"
                  style={styles.chatInput}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!chatInput.trim() || loading) && styles.sendButtonDisabled
                  ]}
                  onPress={() => handleSendMessage()}
                  disabled={!chatInput.trim() || loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={selectedCoachType?.gradient || ['#667eea', '#764ba2']}
                    style={styles.sendButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="send" size={18} color="white" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
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
  
  // Enhanced Header
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
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
    marginRight: 6,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  newChatButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  newChatButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: {
    flex: 1,
  },
  
  // Enhanced Coach Selection
  coachSelectionContainer: {
    flex: 1,
  },
  welcomeHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: 20,
  },
  welcomeIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  
  // Enhanced Coach Cards
  coachCardsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 20,
  },
  coachCardWrapper: {
    marginBottom: 4,
  },
  coachCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  coachCardGradient: {
    position: 'relative',
    overflow: 'hidden',
  },
  coachCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    zIndex: 2,
  },
  coachIconWrapper: {
    marginRight: 20,
  },
  coachIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  coachDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  selectArrow: {
    marginLeft: 16,
  },
  cardDecorations: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  decoration: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  decoration1: {
    width: 100,
    height: 100,
    top: -30,
    right: -30,
  },
  decoration2: {
    width: 60,
    height: 60,
    bottom: -20,
    left: -20,
  },
  
  // Enhanced Selection Footer
  selectionFooter: {
    padding: 24,
    alignItems: 'center',
  },
  trustIndicators: {
    flexDirection: 'row',
    gap: 24,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Enhanced Chat Container
  chatContainer: {
    flex: 1,
  },
  
  // Enhanced Quick Actions
  quickActionsSection: {
    marginBottom: 8,
  },
  quickActionsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 16,
  },
  quickActionsScrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  quickActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Enhanced Messages
  chatMessages: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatMessagesContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
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
    maxWidth: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  userBubble: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomLeftRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userBubbleGradient: {
    padding: 16,
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  aiMessageText: {
    color: '#333',
    fontSize: 16,
    lineHeight: 22,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  aiTimestamp: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 3,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 3,
  },
  
  // Enhanced Typing Animation
  typingMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  dot1: { animationDelay: '0ms' },
  dot2: { animationDelay: '150ms' },
  dot3: { animationDelay: '300ms' },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Enhanced Input
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sendButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
    elevation: 2,
  },
  sendButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});