import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
const { width } = Dimensions.get('window');
const scale = (multiplier, max) => Math.min(width * multiplier, max);

export default function ChatbotScreen({ navigation, user }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([
    { id: '1', title: 'Leg Day Plan' },
    { id: '2', title: 'Diet Tips' },
  ]);

  const username = user?.displayName || user?.email?.split('@')[0] || 'User';
const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
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
          <Text style={styles.sidebarTitle}>💬 Conversations</Text>
          {conversations.map((conv) => (
            <TouchableOpacity key={conv.id} style={styles.convoItem}>
              <Text style={styles.convoText}>{conv.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text style={styles.messageText}>{item.content}</Text>
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
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="white" />
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
    fontSize: 18,
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
    backgroundColor: '#111',
    borderRightWidth: 1,
    borderRightColor: '#333',
    padding: 12,
  },
  sidebarTitle: {
    color: '#aaa',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  convoItem: {
    backgroundColor: '#222',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  convoText: {
    color: '#eee',
    fontSize: 14,
  },

  chatArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },

  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#9C27B0',
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#000',
    fontSize: 15,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    marginLeft: 8,
    borderRadius: 20,
  },
});
