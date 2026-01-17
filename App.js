import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './AuthContext';
import LoginScreen from './Screen/LoginScreen';
import AdminDashboard from './Screen/AdminDashboard';
import ManageCustomers from './Screen/ManageCustomers';
import ManageStaff from './Screen/ManageStaff';
import AssignCustomers from './Screen/AssignCustomers';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && isAdmin ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="ManageCustomers" component={ManageCustomers} />
            <Stack.Screen name="ManageStaff" component={ManageStaff} />
            <Stack.Screen name="AssignCustomers" component={AssignCustomers} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
