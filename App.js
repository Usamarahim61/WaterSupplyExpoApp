import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './Screen/LoginScreen';
import AdminDashboard from './Screen/AdminDashboard';
import ManageCustomers from './Screen/ManageCustomers';
import ManageStaff from './Screen/ManageStaff';
import AssignCustomers from './Screen/AssignCustomers';


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="ManageCustomers" component={ManageCustomers} />
        <Stack.Screen name="ManageStaffs" component={ManageStaff} />
        <Stack.Screen name="AssignCustomers" component={AssignCustomers} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}