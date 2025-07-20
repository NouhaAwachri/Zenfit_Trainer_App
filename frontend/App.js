import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, firebaseConfig } from './firebaseConfig'; // or define firebaseConfig here
import Welcome from './screens/Welcome';
import HomeScreen from './screens/HomeScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import GenProgramScreen from './screens/GenProgramScreen'; 
import WorkoutLogsScreen from './screens/WorkoutLogsScreen'; // Assuming you have a WorkoutLog screen
import DashboardScreen from './screens/DashboardScreen';   
import Login from './screens/Login';
import Signup from './screens/Signup';
import ResetPassword from './screens/ResetPassword';
import { Platform } from 'react-native';
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Custom Drawer Content
function CustomDrawerContent(props) {
  const { state, navigation } = props;
  const currentRoute = state.routeNames[state.index];

  const drawerItems = [
    { label: '🏠 Home', route: 'HomeScreen' },
    { label: '💬 Generate Workout Program', route: 'GenProgram' },
    { label: '💬 Chat with Coach', route: 'Chatbot' },
    { label: '📊 Workout Logs', route: 'WorkoutLogs' },
    { label: '📊 Progress Dashboard', route: 'Dashboard' },
  ];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 40 }}>
      {drawerItems.map((item, index) => {
        const isActive = currentRoute === item.route;
        return (
          <DrawerItem
            key={index}
            label={() => (
              <Text style={[styles.drawerLabel, isActive && styles.activeDrawerLabel]}>
                {item.label}
              </Text>
            )}
            onPress={() => navigation.navigate(item.route)}
            style={[styles.drawerItem, isActive && styles.activeDrawerItem]}
          />
        );
      })}
      <DrawerItem
        label={() => <Text style={styles.drawerLabel}>🚪 Logout</Text>}
        onPress={async () => {
          try {
            await signOut(auth);
            if (props.logout) props.logout();
          } catch (e) {
            console.error('Logout error:', e);
          }
        }}
        style={styles.drawerItem}
      />
    </DrawerContentScrollView>
  );
}

// Drawer for authenticated users
function AppDrawer({ logout, user }) {
  return (
    <Drawer.Navigator
      initialRouteName="HomeScreen"
      drawerContent={(props) => <CustomDrawerContent {...props} logout={logout} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="HomeScreen">
        {(props) => <HomeScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="GenProgram">
        {(props) => <GenProgramScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Chatbot">
        {(props) => <ChatbotScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="WorkoutLogs">
        {(props) => <WorkoutLogsScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Dashboard">
        {(props) => <DashboardScreen {...props} user={user} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

// Stack for unauthenticated users
function AuthStack({ onLoginSuccess }) {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Login">
        {(props) => <Login {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
      if (Platform.OS !== 'web') {
        GoogleSignin.configure({
          webClientId:'380120986027-u3qn7issf00cc87ppebd6uj1u5i8l1if.apps.googleusercontent.com', 
        });
      }
    }, []);

 
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      console.log('Firebase user:', usr);
      setUser(usr);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <AppDrawer logout={handleLogout} user={user} />
      ) : (
        <AuthStack onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerItem: {
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 10,
    padding: 6,
  },
  activeDrawerItem: {
    backgroundColor: '#9C27B0',
  },
  drawerLabel: {
    fontSize: 16,
    color: '#444',
    paddingVertical: 4,
  },
  activeDrawerLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
});
