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
  Image,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const maleImageUri = 'https://img.icons8.com/color/96/male.png';
const femaleImageUri = 'https://img.icons8.com/color/96/female.png';

export default function GenProgramScreen({ navigation, user }) {
  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
  const questions = [
    "What's your gender?",
    "How old are you?",
    "What's your height? (cm)",
    "What's your weight? (kg)",
    "What's your primary goal?",
    "Experience level?",
    "Workout days per week?",
    "Available equipment?",
    "Preferred workout style?",
  ];

  const questionSubtitles = [
    "Help us personalize your program",
    "This helps determine intensity levels",
    "For proper form recommendations",
    "To calculate your training zones",
    "muscle gain, fat loss, strength, etc.",
    "beginner, intermediate, or advanced",
    "How many days can you commit?",
    "gym, home, bodyweight, etc.",
    "HIIT, strength, cardio, etc.",
  ];

  const keys = [
    "gender", "age", "height", "weight",
    "goal", "experience", "days_per_week",
    "equipment", "style"
  ];

  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [input, setInput] = useState('');
  const [generated, setGenerated] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedGender, setSelectedGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planVersions, setPlanVersions] = useState([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  const loadConversation = async (conversationId) => {
    try {
      const res = await fetch(`http://192.168.1.8:5000/generate/messages/${conversationId}`);
      const data = await res.json();
      const formatted = data.map(msg => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        text: msg.content,
      }));
      setChatHistory(formatted);
    } catch (e) {
      console.error("Failed to load conversation messages", e);
    }
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`http://192.168.1.8:5000/generate/history/${user?.uid}`);
        const data = await res.json();
        setConversations(data);
      } catch (e) {
        console.error("Failed to fetch chat history:", e);
      }
    };
    if (chatMode) fetchChatHistory();
  }, [chatMode]);

  useEffect(() => {
    const checkExistingWorkout = async () => {
      try {
        const response = await fetch('http://192.168.1.8:5000/generate/check-existing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebase_uid: user?.uid }),
        });
        const data = await response.json();
        if (data.exists) {
          setGenerated(data.latest_program);
          setPlanVersions([data.latest_program]);
          setSelectedVersionIndex(0);
          setChatMode(true);
          setChatHistory([{ type: 'ai', text: data.latest_program }]);

        }
      } catch (e) {
        console.error("Failed to check existing workout:", e);
      } finally {
        setInitializing(false);
      }
    };
    checkExistingWorkout();
  }, []);

  useEffect(() => {
    if (currentQuestionIndex >= 0) {
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
  }, [currentQuestionIndex]);

  const handleNext = async () => {
    const answerValue = currentQuestionIndex === 0 ? selectedGender : input.trim();
    if (!answerValue) return;
    
    const updatedAnswers = { ...answers, [keys[currentQuestionIndex]]: answerValue };
    setAnswers(updatedAnswers);
    setInput('');
    if (currentQuestionIndex === 0) setSelectedGender(null);

    if (currentQuestionIndex === questions.length - 1) {
      setLoading(true);
      try {
        const response = await fetch('http://192.168.1.8:5000/generate/generate-workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebase_uid: user?.uid, ...updatedAnswers }),
        });
        const data = await response.json();
        if (response.ok) {
          setGenerated(data.program);
          setPlanVersions(prev => [...prev, data.program]);
          setSelectedVersionIndex(0);
          setChatHistory([{ type: 'ai', text: data.program }]);
          setChatMode(true);
        } else {
          setGenerated(`❌ Error: ${data.error}`);
        }
      } catch (e) {
        console.error('Error:', e);
        setGenerated('❌ Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleFollowUpSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { type: 'user', text: chatInput };
    const typingMessage = { type: 'typing', text: '...' };
    setChatHistory(prev => [...prev, userMessage, typingMessage]);
    setChatInput('');

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch('http://192.168.1.8:5000/generate/chat-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user?.uid,
          feedback: chatInput,
        }),
      });

      const data = await response.json();
      const aiText = data.adjusted_program || data.error || '❌ No response';

      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.type !== 'typing');
        return [...withoutTyping, { type: 'ai', text: aiText }];
      });

      if (data.adjusted_program) {
        setPlanVersions(prev => [...prev, data.adjusted_program]);
        setSelectedVersionIndex(planVersions.length);
        setGenerated(data.adjusted_program);
      }

    } catch (e) {
      console.error(e);
      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.type !== 'typing');
        return [...withoutTyping, { type: 'ai', text: '❌ Server error. Try again.' }];
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('http://192.168.1.8:5000/generate/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: user?.uid, version: selectedVersionIndex ?? 0 }),
      });
      const blob = await response.blob();
      const fileURL = URL.createObjectURL(blob);
      Linking.openURL(fileURL);
    } catch (error) {
      console.error('PDF download failed', error);
    }
  };

  const restart = () => {
    setInput('');
    setAnswers({});
    setCurrentQuestionIndex(0);
    setGenerated(null);
    setChatMode(false);
    setChatInput('');
    setChatHistory([]);
    setSelectedGender(null);
    setPlanVersions([]);
    setSelectedVersionIndex(null);
    setShowHistory(false);
  };

  const renderGenderSelection = () => (
    <View style={styles.genderContainer}>
      {["male", "female"].map(gender => (
        <TouchableOpacity
          key={gender}
          style={[
            styles.genderOption,
            selectedGender === gender && styles.genderSelected
          ]}
          onPress={() => setSelectedGender(gender)}
          activeOpacity={0.8}
        >
          <View style={styles.genderImageContainer}>
            <Image
              source={{ uri: gender === 'male' ? maleImageUri : femaleImageUri }}
              style={styles.genderImage}
            />
          </View>
          <Text style={styles.genderLabel}>
            {gender.charAt(0).toUpperCase() + gender.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuestionProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentQuestionIndex + 1} of {questions.length}
      </Text>
    </View>
  );

  const renderChatMessage = ({ item, index }) => {
    if (item.type === 'typing') {
      return (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#6C63FF" />
            <Text style={styles.typingText}>AI is typing...</Text>
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
          <View style={styles.aiAvatar}>
            <Ionicons name="fitness" size={16} color="#fff" />
          </View>
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
        </View>
        {item.type === 'user' && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        )}
      </Animated.View>
    );
  };

  if (initializing) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Setting up your workout...</Text>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Workout Generator</Text>
          <Text style={styles.headerSubtitle}>AI-Powered Fitness</Text>
        </View>
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
        {!generated ? (
          // Question Flow
          <View style={styles.questionContainer}>
            {renderQuestionProgress()}
            
            <Animated.View
              style={[
                styles.questionContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.questionText}>
                {questions[currentQuestionIndex]}
              </Text>
              <Text style={styles.questionSubtitle}>
                {questionSubtitles[currentQuestionIndex]}
              </Text>

              {loading ? (
                <View style={styles.loadingSection}>
                  <ActivityIndicator size="large" color="#6C63FF" />
                  <Text style={styles.loadingText}>Generating your program...</Text>
                </View>
              ) : currentQuestionIndex === 0 ? (
                renderGenderSelection()
              ) : (
                <TextInput
                  ref={textInputRef}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="#999"
                  keyboardType={
                    ['age', 'height', 'weight', 'days_per_week'].includes(keys[currentQuestionIndex])
                      ? 'numeric'
                      : 'default'
                  }
                  style={styles.input}
                  multiline={false}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              )}
            </Animated.View>

            {!loading && (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (!input.trim() && !selectedGender) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={!input.trim() && !selectedGender}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6C63FF', '#9C63FF']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {currentQuestionIndex === questions.length - 1 ? 'Generate Program' : 'Next'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Chat Mode
          <View style={styles.chatContainer}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleDownload}
              >
                <Ionicons name="download" size={16} color="#6C63FF" />
                <Text style={styles.quickActionText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setShowHistory(!showHistory)}
              >
                <Ionicons name="time" size={16} color="#6C63FF" />
                <Text style={styles.quickActionText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={restart}
              >
                <Ionicons name="refresh" size={16} color="#6C63FF" />
                <Text style={styles.quickActionText}>New</Text>
              </TouchableOpacity>
            </View>

            {/* History Panel */}
            {showHistory && (
              <View style={styles.historyPanel}>
                <Text style={styles.historyTitle}>Recent Plans</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {planVersions.map((plan, idx) => (
                    <TouchableOpacity
                      key={`plan-${idx}`}
                      style={[
                        styles.historyItem,
                        selectedVersionIndex === idx && styles.historyItemActive
                      ]}
                      onPress={() => {
                        setGenerated(plan);
                        setSelectedVersionIndex(idx);
                        setChatHistory([{ type: 'ai', text: plan }]);
                      }}
                    >
                      <Text style={styles.historyItemText}>Plan {idx + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={chatHistory}
              renderItem={renderChatMessage}
              keyExtractor={(_, index) => index.toString()}
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
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask me anything about your workout..."
                placeholderTextColor="#999"
                style={styles.chatInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !chatInput.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleFollowUpSend}
                disabled={!chatInput.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6C63FF', '#9C63FF']}
                  style={styles.sendButtonGradient}
                >
                  <Ionicons name="send" size={20} color="#fff" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
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
  profileButton: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  questionContainer: {
    flex: 1,
    padding: 24,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  questionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  genderOption: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#f0f0ff',
  },
  genderImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  genderImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingSection: {
    alignItems: 'center',
    padding: 40,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    gap: 6,
  },
  quickActionText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  historyPanel: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
  },
  historyItemActive: {
    backgroundColor: '#6C63FF',
  },
  historyItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
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
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
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
    marginLeft: 44,
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
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
  
  // Enhanced styles for better UX
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  planCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  
  planCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  
  planCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  planCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    gap: 6,
  },
  
  planCardButtonText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Improved animations
  slideInFromRight: {
    transform: [{ translateX: width }],
  },
  
  slideInFromLeft: {
    transform: [{ translateX: -width }],
  },
  
  fadeInUp: {
    opacity: 0,
    transform: [{ translateY: 30 }],
  },
  
  scaleIn: {
    opacity: 0,
    transform: [{ scale: 0.8 }],
  },
  
  // Enhanced input styles
  inputFocused: {
    borderColor: '#6C63FF',
    backgroundColor: '#f0f0ff',
  },
  
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#fff0f0',
  },
  
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Loading states
  skeletonText: {
    backgroundColor: '#e0e0e0',
    height: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  
  skeletonBubble: {
    backgroundColor: '#e0e0e0',
    height: 60,
    borderRadius: 20,
    marginVertical: 8,
  },
  
  // Success states
  successContainer: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  
  successText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Enhanced chat styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  chatHeaderInfo: {
    flex: 1,
  },
  
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  chatHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Message timestamp
  messageTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  
  // Quick replies
  quickRepliesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  
  quickRepliesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  
  quickRepliesScroll: {
    flexDirection: 'row',
  },
  
  quickReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  quickReplyText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Workout plan preview
  workoutPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  workoutPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  
  workoutPreviewContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  workoutPreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  
  previewButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  previewButtonPrimary: {
    backgroundColor: '#6C63FF',
  },
  
  previewButtonSecondary: {
    backgroundColor: '#e0e0e0',
  },
  
  previewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  previewButtonTextPrimary: {
    color: '#fff',
  },
  
  previewButtonTextSecondary: {
    color: '#666',
  },
});