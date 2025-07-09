// GenProgramScreen.js
import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function GenProgramScreen({ navigation, user }) {
  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
  const [questions, setQuestions] = useState([
    "What's your gender? (male/female)",
    "What's your age?",
    "What’s your primary goal? (e.g. muscle gain, fat loss)",
    "What’s your experience level? (e.g. beginner, intermediate, advanced)",
    "How many days per week can you work out?",
    "What equipment do you have access to? (e.g. gym, dumbbells, resistance bands, bodyweight only)",
    "Preferred workout style? (e.g. Full body, Push/Pull/Legs, Upper/Lower split)",
  ]);

  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [input, setInput] = useState('');
  const [generated, setGenerated] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const handleNext = async () => {
    if (!input.trim()) return;

    const updatedAnswers = {
      ...answers,
      [questions[currentQuestionIndex]]: input,
    };

    setAnswers(updatedAnswers);
    setInput('');

    if (currentQuestionIndex === questions.length - 1) {
      try {
        const response = await fetch('http://192.168.183.1:5000/generate/generate-workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebase_uid: user?.uid,
            gender: updatedAnswers[questions[0]],
            age: updatedAnswers[questions[1]],
            goal: updatedAnswers[questions[2]],
            experience: updatedAnswers[questions[3]],
            days_per_week: updatedAnswers[questions[4]],
            equipment: updatedAnswers[questions[5]],
            style: updatedAnswers[questions[6]],
          })
        });

        const data = await response.json();
        if (response.ok) {
          setGenerated(data.program);
        } else {
          setGenerated(`❌ Error: ${data.error}`);
        }
      } catch (error) {
        console.error('Error generating program:', error);
        setGenerated('❌ Failed to connect to server');
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
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
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('http://192.168.183.1:5000/generate/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const blob = await response.blob();
      const pdfURL = URL.createObjectURL(blob);
      Linking.openURL(pdfURL);
    } catch (error) {
      console.error('PDF Download failed', error);
    }
  };

  const handleFollowUpSend = async () => {
    if (!chatInput.trim()) return;
    const updatedHistory = [...chatHistory, { type: 'user', text: chatInput }];
    setChatHistory(updatedHistory);
    setChatInput('');

    try {
      const response = await fetch('http://192.168.183.1:5000/chatbot/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.uid, question: chatInput }),
      });
      const data = await response.json();
      setChatHistory([...updatedHistory, { type: 'ai', text: data.answer }]);
    } catch (error) {
      setChatHistory([...updatedHistory, { type: 'ai', text: '❌ Failed to respond.' }]);
    }
  };

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
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === questions.length - 1 ? 'Generate' : 'Next'}
              </Text>
            </TouchableOpacity>
          </>
        ) : chatMode ? (
          <>
            <FlatList
              data={chatHistory}
              renderItem={({ item }) => (
                <View style={item.type === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI}>
                  <Text style={styles.chatText}>{item.text}</Text>
                </View>
              )}
              keyExtractor={(_, index) => index.toString()}
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
          </>
        ) : (
          <ScrollView style={styles.chatContainer}>
            <View style={styles.chatBubbleUser}>
              <Text style={styles.chatText}>🏋️ Personalized Program</Text>
            </View>
            <View style={styles.chatBubbleAI}>
              <Text style={styles.chatText}>{generated}</Text>
            </View>
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
  content: { flex: 1, backgroundColor: '#111', padding: 20, justifyContent: 'center' },
  questionText: { color: '#fff', fontSize: 18, marginBottom: 16, fontWeight: '500' },
  input: { backgroundColor: '#333', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 20 },
  nextButton: { backgroundColor: '#9C27B0', padding: 14, borderRadius: 30, alignItems: 'center' },
  nextButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatContainer: { flex: 1, backgroundColor: '#111', padding: 10 },
  chatBubbleUser: { backgroundColor: '#9C27B0', alignSelf: 'flex-end', padding: 12, borderRadius: 16, marginVertical: 5, maxWidth: '80%' },
  chatBubbleAI: { backgroundColor: '#333', alignSelf: 'flex-start', padding: 12, borderRadius: 16, marginVertical: 5, maxWidth: '80%' },
  chatText: { color: '#fff', fontSize: 15 },
  downloadButton: { marginTop: 10, backgroundColor: '#444', padding: 10, borderRadius: 20, alignItems: 'center' },
  downloadText: { color: '#fff' },
  followUpButton: { marginTop: 10, backgroundColor: '#555', padding: 10, borderRadius: 20, alignItems: 'center' },
  followUpText: { color: '#fff', fontWeight: '600' },
  restartButton: { backgroundColor: '#444', padding: 12, borderRadius: 25, marginTop: 20, alignItems: 'center' },
  restartText: { color: '#fff', fontWeight: 'bold' },
});
