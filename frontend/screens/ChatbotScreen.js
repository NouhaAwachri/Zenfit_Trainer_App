import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function ChatbotScreen({ navigation, user }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [plans, setPlans] = useState([
    { id: '1', title: 'Push-Pull Split Week 1' },
    { id: '2', title: 'Fat Loss Plan - Month 1' },
    { id: '3', title: 'Strength Build Phase' },
  ]);
  const [selectedPlanId, setSelectedPlanId] = useState('1');

  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
  const flatListRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Load messages for selected plan — stub for now
  useEffect(() => {
    // Replace with actual fetch/load logic
    // Example stub:
    if (selectedPlanId === '1') {
      setMessages([
        { role: 'ai', content: 'Welcome to your Push-Pull Split plan! Ready to crush it?' },
      ]);
    } else if (selectedPlanId === '2') {
      setMessages([
        { role: 'ai', content: 'This Fat Loss Plan will help you shred fat safely.' },
      ]);
    } else {
      setMessages([
        { role: 'ai', content: 'Focus on heavy lifts this Strength Build Phase.' },
      ]);
    }
  }, [selectedPlanId]);

  const sendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: input.trim() }]);
    setInput('');

    // Simulate AI response (replace with your backend API call)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Got it! Let me analyze that for you...' },
      ]);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat with Coach</Text>
        <View style={styles.usernameWrapper}>
          <Ionicons name="person-circle-outline" size={22} color="white" />
          <Text style={styles.username}>Hello, {username}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>🏋️‍♂️ My Programs</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlanId(plan.id)}
              style={[
                styles.convoItem,
                selectedPlanId === plan.id && styles.convoItemSelected,
              ]}
            >
              <Text
                style={[
                  styles.convoText,
                  selectedPlanId === plan.id && styles.convoTextSelected,
                ]}
              >
                {plan.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 12 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.role === 'user' ? styles.userText : styles.botText,
                  ]}
                >
                  {item.content}
                </Text>
              </View>
            )}
          />

          {/* Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask your coach..."
              placeholderTextColor="#aaa"
              style={styles.input}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
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
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  usernameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  username: {
    color: 'white',
    fontSize: scale(0.035, 15),
  },

  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },

  sidebar: {
    width: width * 0.28,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  sidebarTitle: {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 14,
  },
  convoItem: {
    backgroundColor: '#292929',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  convoItemSelected: {
    backgroundColor: '#9C27B0',
  },
  convoText: {
    color: '#eee',
    fontWeight: '600',
  },
  convoTextSelected: {
    color: 'white',
  },

  chatArea: {
    flex: 1,
    backgroundColor: '#121212',
  },

  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  userBubble: {
    backgroundColor: '#9C27B0',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
    shadowColor: '#9C27B0',
    shadowOpacity: 0.9,
  },
  botBubble: {
    backgroundColor: '#292929',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#ccc',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  input: {
    flex: 1,
    backgroundColor: '#292929',
    color: '#fff',
    borderRadius: 25,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#9C27B0',
    padding: 14,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
});
