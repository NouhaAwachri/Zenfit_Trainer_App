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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const maleImageUri = 'https://img.icons8.com/color/96/male.png';
const femaleImageUri = 'https://img.icons8.com/color/96/female.png';
const BACKEND_URL = 'http://192.168.1.10:5000';

// Enhanced Dropdown Component
const CustomDropdown = ({ 
  options = [], 
  value, 
  onSelect, 
  placeholder = "Select an option", 
  style = {},
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchText.toLowerCase())
  );

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start(() => setIsOpen(false));
    } else {
      setIsOpen(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  };

  const selectOption = (option) => {
    onSelect(option);
    setSearchText('');
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start(() => setIsOpen(false));
  };

  return (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
          isOpen && styles.dropdownButtonOpen
        ]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dropdownButtonText,
          !value && styles.dropdownPlaceholder
        ]}>
          {value || placeholder}
        </Text>
        <Animated.View
          style={{
            transform: [{
              rotate: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              })
            }]
          }}
        >
          <Ionicons name="chevron-down" size={20} color="#8B7CF6" />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View 
            style={[
              styles.dropdownModal,
              {
                transform: [{
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }],
                opacity: slideAnim,
              }
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Choose Option</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    item === value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => selectOption(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    item === value && styles.dropdownOptionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {item === value && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark" size={18} color="#8B7CF6" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Ionicons name="search" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyDropdownText}>No options found</Text>
                </View>
              )}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// History Modal Component
const HistoryModal = ({ 
  visible, 
  onClose, 
  conversations, 
  onSelectConversation 
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const handleSelectConversation = (conversationId) => {
    onSelectConversation(conversationId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.historyModalOverlay}>
        <Animated.View
          style={[
            styles.historyModalContainer,
            {
              transform: [{
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }],
              opacity: slideAnim,
            }
          ]}
        >
          {/* Modal Header */}
          <View style={styles.historyModalHeader}>
            <View style={styles.historyModalHeaderLeft}>
              <View style={styles.historyModalIcon}>
                <Ionicons name="time" size={24} color="#8B7CF6" />
              </View>
              <View>
                <Text style={styles.historyModalTitle}>Workout History</Text>
                <Text style={styles.historyModalSubtitle}>
                  {conversations.length} previous workout{conversations.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.historyModalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* History List */}
          <ScrollView style={styles.historyModalContent} showsVerticalScrollIndicator={false}>
            {conversations.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <View style={styles.emptyHistoryIcon}>
                  <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyHistoryTitle}>No Previous Workouts</Text>
                <Text style={styles.emptyHistoryText}>
                  Your workout history will appear here after you generate your first program.
                </Text>
              </View>
            ) : (
              conversations.map((conversation, index) => (
                <TouchableOpacity
                  key={conversation.conversation_id}
                  style={styles.historyItem}
                  onPress={() => handleSelectConversation(conversation.conversation_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyItemIcon}>
                    <Ionicons name="fitness" size={20} color="#8B7CF6" />
                  </View>
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemTitle}>
                      {conversation.title || `Workout Plan ${index + 1}`}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      Created {new Date(conversation.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyItemAction}>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

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

  const dropdownOptions = {
    goal: [
      "Muscle Gain",
      "Fat Loss", 
      "Strength Building",
      "Endurance",
      "General Fitness",
      "Athletic Performance",
      "Flexibility & Mobility",
      "Body Recomposition",
      "Powerlifting",
      "Bodybuilding"
    ],
    experience: [
      "Complete Beginner",
      "Beginner (1-6 months)",
      "Intermediate (6 months - 2 years)",
      "Advanced (2-5 years)",
      "Expert (5+ years)"
    ],
    days_per_week: [
      "1 day",
      "2 days", 
      "3 days",
      "4 days",
      "5 days",
      "6 days",
      "7 days"
    ],
    equipment: [
      "Full Gym Access",
      "Home Gym (Weights & Machines)",
      "Basic Home Equipment (Dumbbells, Resistance Bands)",
      "Bodyweight Only",
      "Minimal Equipment (Dumbbells Only)",
      "Resistance Bands Only",
      "Kettlebells Only",
      "Outdoor/Park Equipment"
    ],
    style: [
      "Strength Training",
      "HIIT (High Intensity Interval Training)",
      "Cardio Focus",
      "Bodybuilding",
      "Powerlifting",
      "CrossFit Style",
      "Yoga & Flexibility",
      "Circuit Training",
      "Functional Training",
      "Sports-Specific Training"
    ]
  };

  const dropdownQuestions = ["goal", "experience", "days_per_week", "equipment", "style"];
  const numericQuestions = ["age", "height", "weight"];

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
  const [dropdownValue, setDropdownValue] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  const loadConversation = async (conversationId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/generate/messages/${conversationId}`);
      const data = await res.json();
      const formatted = data.map(msg => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        text: msg.content,
        timestamp: new Date().toISOString(),
      }));
      setChatHistory(formatted);
    } catch (e) {
      console.error("Failed to load conversation messages", e);
    }
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/generate/history/${user?.uid}`);
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
        const response = await fetch(`${BACKEND_URL}/generate/check-existing`, {
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
          setChatHistory([
            { 
              type: 'ai', 
              text: data.latest_program,
              timestamp: new Date().toISOString(),
            }
          ]);
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
      slideAnim.setValue(30);
      setInput('');
      setDropdownValue('');
      setSelectedGender(null);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentQuestionIndex]);

  const getCurrentInputValue = () => {
    const currentKey = keys[currentQuestionIndex];
    if (currentKey === "gender") return selectedGender;
    if (dropdownQuestions.includes(currentKey)) return dropdownValue;
    return input.trim();
  };

  const isCurrentAnswerValid = () => {
    const value = getCurrentInputValue();
    return value && value.length > 0;
  };

  const handleNext = async () => {
    const answerValue = getCurrentInputValue();
    if (!answerValue) return;
    
    const updatedAnswers = { ...answers, [keys[currentQuestionIndex]]: answerValue };
    setAnswers(updatedAnswers);

    if (currentQuestionIndex === questions.length - 1) {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/generate/generate-workout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebase_uid: user?.uid, ...updatedAnswers }),
        });
        const data = await response.json();
        if (response.ok) {
          setGenerated(data.program);
          setPlanVersions(prev => [...prev, data.program]);
          setSelectedVersionIndex(0);
          setChatHistory([
            { 
              type: 'ai', 
              text: data.program,
              timestamp: new Date().toISOString(),
            }
          ]);
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
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleFollowUpSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { 
      type: 'user', 
      text: chatInput,
      timestamp: new Date().toISOString(),
    };
    const typingMessage = { 
      type: 'typing', 
      text: 'AI is thinking...',
      timestamp: new Date().toISOString(),
    };
    setChatHistory(prev => [...prev, userMessage, typingMessage]);
    setChatInput('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch(`${BACKEND_URL}/generate/chat-follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user?.uid,
          current_plan: generated,
          feedback: chatInput
        }),
      });

      const data = await response.json();
      const aiText = data.response || data.new_program || data.current_program || data.error || '❌ No response';

      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.type !== 'typing');
        return [...withoutTyping, { type: 'ai', text: aiText, timestamp: new Date().toISOString() }];
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
        return [...withoutTyping, { 
          type: 'ai', 
          text: '❌ Server error. Please try again.',
          timestamp: new Date().toISOString(),
        }];
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/generate/pdf`, {
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
    setDropdownValue('');
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
          activeOpacity={0.7}
        >
          <View style={[
            styles.genderImageContainer,
            selectedGender === gender && styles.genderImageSelected
          ]}>
            <Image
              source={{ uri: gender === 'male' ? maleImageUri : femaleImageUri }}
              style={styles.genderImage}
            />
          </View>
          <Text style={[
            styles.genderLabel,
            selectedGender === gender && styles.genderLabelSelected
          ]}>
            {gender.charAt(0).toUpperCase() + gender.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuestionInput = () => {
    const currentKey = keys[currentQuestionIndex];
    
    if (currentKey === "gender") {
      return renderGenderSelection();
    }
    
    if (dropdownQuestions.includes(currentKey)) {
      return (
        <CustomDropdown
          options={dropdownOptions[currentKey] || []}
          value={dropdownValue}
          onSelect={setDropdownValue}
          placeholder={`Select ${currentKey.replace('_', ' ')}`}
          style={styles.dropdownInput}
        />
      );
    }
    
    return (
      <TextInput
        ref={textInputRef}
        value={input}
        onChangeText={setInput}
        placeholder="Type your answer..."
        placeholderTextColor="#9CA3AF"
        keyboardType={numericQuestions.includes(currentKey) ? 'numeric' : 'default'}
        style={styles.input}
        multiline={false}
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />
    );
  };

  const renderQuestionProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            { 
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Question {currentQuestionIndex + 1} of {questions.length}
      </Text>
    </View>
  );

  const renderChatMessage = ({ item, index }) => {
    if (item.type === 'typing') {
      return (
        <View style={styles.typingContainer}>
          <View style={styles.aiAvatar}>
            <ActivityIndicator size="small" color="#8B7CF6" />
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>{item.text}</Text>
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
            <Ionicons name="flash" size={16} color="#FFF" />
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
            <Ionicons name="person" size={16} color="#FFF" />
          </View>
        )}
      </Animated.View>
    );
  };

  if (initializing) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Initializing your workspace...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Enhanced Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Fitness Coach</Text>
          <Text style={styles.headerSubtitle}>Personalized Workout Generator</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="notifications" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {!generated ? (
          // Enhanced Question Flow
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
              <View style={styles.questionHeader}>
                <Text style={styles.questionText}>
                  {questions[currentQuestionIndex]}
                </Text>
                <Text style={styles.questionSubtitle}>
                  {questionSubtitles[currentQuestionIndex]}
                </Text>
              </View>

              {loading ? (
                <View style={styles.loadingSection}>
                  <View style={styles.loadingAnimation}>
                    <ActivityIndicator size="large" color="#8B7CF6" />
                  </View>
                  <Text style={styles.loadingText}>Creating your personalized program...</Text>
                  <Text style={styles.loadingSubtext}>This may take a few moments</Text>
                </View>
              ) : (
                <View style={styles.inputSection}>
                  {renderQuestionInput()}
                </View>
              )}
            </Animated.View>

            {!loading && (
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    !isCurrentAnswerValid() && styles.nextButtonDisabled
                  ]}
                  onPress={handleNext}
                  disabled={!isCurrentAnswerValid()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isCurrentAnswerValid() ? ['#8B7CF6', '#6366F1'] : ['#D1D5DB', '#9CA3AF']}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={[
                      styles.nextButtonText,
                      !isCurrentAnswerValid() && styles.nextButtonTextDisabled
                    ]}>
                      {currentQuestionIndex === questions.length - 1 ? 'Generate Program' : 'Continue'}
                    </Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color={isCurrentAnswerValid() ? "#FFF" : "#9CA3AF"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Enhanced Chat Mode with Better History UI
          <View style={styles.chatContainer}>
            {/* Chat Header with Actions */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatar}>
                  <Ionicons name="flash" size={20} color="#8B7CF6" />
                </View>
                <View>
                  <Text style={styles.chatHeaderTitle}>AI Fitness Coach</Text>
                  <Text style={styles.chatHeaderSubtitle}>Ready to help you</Text>
                </View>
              </View>
              <View style={styles.chatHeaderActions}>
                <TouchableOpacity
                  style={styles.chatActionButton}
                  onPress={() => setHistoryModalVisible(true)}
                >
                  <View style={styles.historyButtonContent}>
                    <Ionicons name="time" size={20} color="#8B7CF6" />
                    {conversations.length > 0 && (
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>{conversations.length}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatActionButton}
                  onPress={handleDownload}
                >
                  <Ionicons name="download" size={20} color="#8B7CF6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatActionButton}
                  onPress={restart}
                >
                  <Ionicons name="refresh" size={20} color="#8B7CF6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={chatHistory}
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

            {/* Enhanced Chat Input */}
            <View style={styles.chatInputContainer}>
              <View style={styles.chatInputWrapper}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Ask me anything about your workout..."
                  placeholderTextColor="#9CA3AF"
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
                    colors={chatInput.trim() ? ['#8B7CF6', '#6366F1'] : ['#E5E7EB', '#D1D5DB']}
                    style={styles.sendButtonGradient}
                  >
                    <Ionicons 
                      name="send" 
                      size={18} 
                      color={chatInput.trim() ? "#FFF" : "#9CA3AF"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHelper}>
                Press Enter to send • {500 - chatInput.length} characters left
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* History Modal */}
      <HistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        conversations={conversations}
        onSelectConversation={loadConversation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Content
  content: {
    flex: 1,
  },

  // Question Flow Styles
  questionContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B7CF6',
    borderRadius: 3,
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },

  questionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  questionHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  questionText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  inputSection: {
    marginVertical: 20,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    fontSize: 18,
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Gender Selection
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  genderOption: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  genderSelected: {
    borderColor: '#8B7CF6',
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 1.02 }],
  },
  genderImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  genderImageSelected: {
    backgroundColor: '#EEF2FF',
  },
  genderImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  genderLabelSelected: {
    color: '#8B7CF6',
  },

  // Action Section
  actionSection: {
    paddingTop: 20,
  },
  nextButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  nextButtonDisabled: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nextButtonTextDisabled: {
    color: '#9CA3AF',
  },

  loadingSection: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingAnimation: {
    marginBottom: 24,
  },

  // Dropdown Styles
  dropdownContainer: {
    marginVertical: 8,
  },
  dropdownButton: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownButtonOpen: {
    borderColor: '#8B7CF6',
    backgroundColor: '#F9FAFB',
  },
  dropdownButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  dropdownButtonText: {
    fontSize: 18,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dropdownCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#8B7CF6',
    fontWeight: '600',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDropdown: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyDropdownText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },

  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // History Button Styles
  historyButtonContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  historyBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Chat Messages
  chatMessages: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatMessagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // Message Types
  messageContainer: {
    marginBottom: 20,
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
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#8B7CF6',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  userMessageText: {
    color: '#FFF',
  },
  aiMessageText: {
    color: '#1F2937',
  },

  // Avatars
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B7CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#374151',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  typingBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Chat Input
  chatInputContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },

  // History Modal Styles
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  historyModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  historyModalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  historyModalContent: {
    maxHeight: 400,
  },

  // History Items
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  historyItemAction: {
    paddingLeft: 12,
  },

  // Empty History
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyHistoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});