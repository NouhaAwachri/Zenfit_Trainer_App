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

const { width } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);

const maleImageUri = 'https://img.icons8.com/color/96/male.png';
const femaleImageUri = 'https://img.icons8.com/color/96/female.png';

export default function GenProgramScreen({ navigation, user }) {
  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
  const questions = [
    "What's your gender?",
    "What's your age?",
    "What's your height? (in cm)",
    "What's your weight? (in kg)",
    "What’s your primary goal? (e.g. muscle gain, fat loss)",
    "What’s your experience level? (e.g. beginner, intermediate, advanced)",
    "How many days per week can you work out?",
    "What equipment do you have access to?",
    "Preferred workout style?",
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const [initializing, setInitializing] = useState(true);

useEffect(() => {
  const checkExistingWorkout = async () => {
    try {
      const response = await fetch('http://192.168.1.11:5000/generate/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: user?.uid }),
      });

      const data = await response.json();

      if (data.exists) {
        setGenerated(data.latest_program); // ✅ Load previous plan
        setPlanVersions([data.latest_program]); // ✅ Initialize versions
        setSelectedVersionIndex(0);
        setChatMode(true); // ✅ Go to follow-up mode
      }
    } catch (e) {
      console.error("Failed to check existing workout:", e);
    } finally {
      setInitializing(false); // ✅ Either way, stop loading
    }
  };

  checkExistingWorkout();
}, []);




  useEffect(() => {
    if (flatListRef.current) flatListRef.current.scrollToEnd({ animated: true });
  }, [chatHistory]);

  useEffect(() => {
    if (generated) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [generated]);

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
        const response = await fetch('http://192.168.1.11:5000/generate/generate-workout', {
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
        setChatMode(true);           //  switch to chat
          }
          else setGenerated(`❌ Error: ${data.error}`);
                } catch (e) {
                  console.error('Error:', e);
                  setGenerated('❌ Failed to connect to server');
                } finally { setLoading(false); }
              }
    setCurrentQuestionIndex(prev => prev + 1);
  };

const handleFollowUpSend = async () => {
  if (!chatInput.trim()) return;

  const userMessage = { type: 'user', text: chatInput };
  const typingMessage = { type: 'typing', text: '...' };
  setChatHistory(prev => [...prev, userMessage, typingMessage]);
  setChatInput('');

  try {
    const response = await fetch('http://192.168.1.11:5000/generate/chat-follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebase_uid: user?.uid,
        feedback: chatInput,
      }),
    });

    const data = await response.json();
    const aiText = data.adjusted_program || data.error || '❌ No response';

    // Replace typing message with real response
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
      const response = await fetch('http://192.168.1.11:5000/generate/pdf', {
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
  };

  const renderGenderSelection = () => (
    <View style={styles.genderContainer}>
      {["male", "female"].map(gender => (
        <TouchableOpacity
          key={gender}
          style={[styles.genderOption, selectedGender === gender && styles.genderSelected]}
          onPress={() => setSelectedGender(gender)}
        >
          <Image source={{ uri: gender === 'male' ? maleImageUri : femaleImageUri }} style={styles.genderImage} />
          <Text style={styles.genderLabel}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
        </TouchableOpacity>
      ))}
    </View>
    
  );
if (initializing) {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#9C27B0" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Workout Program</Text>
        <View style={styles.usernameWrapper}>
          <Ionicons name="person-circle-outline" size={22} color="white" />
          <Text style={styles.username}>Hello, {username}</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!generated ? (
          <>
            <Text style={styles.questionText}>{questions[currentQuestionIndex]}</Text>
            {loading ? <ActivityIndicator size="large" color="#9C27B0" /> :
              currentQuestionIndex === 0 ? renderGenderSelection() : (
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="#aaa"
                  keyboardType={['age', 'height', 'weight', 'days_per_week'].includes(keys[currentQuestionIndex]) ? 'numeric' : 'default'}
                  style={styles.input}
                />
              )}
            {!loading && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>{currentQuestionIndex === questions.length - 1 ? 'Generate' : 'Next'}</Text>
              </TouchableOpacity>
            )}
          </>
          
        ) : chatMode ? (
          <>
          {chatMode && (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ color: '#aaa', marginBottom: 4 }}>📚 Your Previous Programs:</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {planVersions.map((plan, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => {
            setGenerated(plan);
            setSelectedVersionIndex(idx);
          }}
          style={{
            padding: 10,
            marginRight: 8,
            backgroundColor: selectedVersionIndex === idx ? '#9C27B0' : '#333',
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff' }}>Plan {idx + 1}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
)}

            <FlatList
              ref={flatListRef}
              data={chatHistory}
              renderItem={({ item }) => {
                if (item.type === 'typing') {
                  return (
                    <View style={styles.chatBubbleAI}>
                      <ActivityIndicator size="small" color="#9C27B0" />
                    </View>
                  );
                }

                return (
                  <View style={item.type === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI}>
                    <Text style={styles.chatText}>{item.text}</Text>
                  </View>
                );
              }}

              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ paddingBottom: 80 }}
            />
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              style={styles.input}
              placeholder="Ask a follow-up question..."
            />
            <TouchableOpacity style={styles.nextButton} onPress={handleFollowUpSend}>
              <Text style={styles.nextButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restartButton} onPress={() => setChatHistory([])}>
              <Text style={styles.restartText}>🧹 Clear Chat</Text>
            </TouchableOpacity>
          </>
        ) : (
          
          <ScrollView style={styles.chatContainer}>
            <View style={styles.chatBubbleUser}>
              <Text style={styles.chatText}>🏋️ Personalized Program</Text>
            </View>
            {planVersions.length > 1 && (
              <View style={{ marginVertical: 10 }}>
                <Text style={{ color: '#aaa', marginBottom: 5 }}>📚 View past versions</Text>
                {planVersions.map((plan, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      padding: 10,
                      marginBottom: 5,
                      backgroundColor: selectedVersionIndex === idx ? '#9C27B0' : '#222',
                      borderRadius: 10,
                    }}
                    onPress={() => {
                      setGenerated(plan);
                      setSelectedVersionIndex(idx);
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Version {idx + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Animated.View style={[styles.chatBubbleAI, { opacity: fadeAnim }]}>
              <Text style={styles.chatText}>{generated}</Text>
            </Animated.View>
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
              <Text style={styles.downloadText}>⬇️ Download as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.followUpButton} onPress={() => setChatMode(true)}>
              <Text style={styles.followUpText}>💬 Ask Follow-up Questions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restartButton} onPress={restart}>
              <Text style={styles.restartText}>🔁 Restart</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: { marginRight: 10 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  usernameWrapper: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  username: { color: 'white', fontSize: scale(0.035, 15) },
  content: {
    flex: 1,
    backgroundColor: '#111',
    padding: 20,
    justifyContent: 'center',
  },
  questionText: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    textAlignVertical: 'center',
  },
  nextButton: {
    backgroundColor: '#9C27B0',
    padding: 16,
    borderRadius: 35,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  chatContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 14,
    borderRadius: 12,
  },
  chatBubbleUser: {
    backgroundColor: '#9C27B0',
    alignSelf: 'flex-end',
    padding: 14,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: '80%',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  chatBubbleAI: {
    backgroundColor: '#292929',
    alignSelf: 'flex-start',
    padding: 14,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  chatText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  downloadButton: {
    marginTop: 18,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  downloadText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  followUpButton: {
    marginTop: 14,
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#555',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  followUpText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  restartButton: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 30,
    marginTop: 30,
    alignItems: 'center',
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
  },
  restartText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  genderOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    width: 120,
    backgroundColor: '#1a1a1a',
  },
  genderSelected: {
    borderColor: '#9C27B0',
    backgroundColor: '#33005f',
  },
  genderImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  genderLabel: {
    marginTop: 10,
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  chatBubbleAI: {
  backgroundColor: '#292929',
  alignSelf: 'flex-start',
  padding: 14,
  borderRadius: 20,
  marginVertical: 6,
  maxWidth: '80%',
},
chatBubbleUser: {
  backgroundColor: '#9C27B0',
  alignSelf: 'flex-end',
  padding: 14,
  borderRadius: 20,
  marginVertical: 6,
  maxWidth: '80%',
},

});
