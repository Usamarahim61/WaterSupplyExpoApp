import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (user) => {
    // For now, simply check if the user email is the admin email
    // This avoids Firestore permission issues entirely
    const isAdminUser = user.email === 'usamarahim61@gmail.com';
    console.log('Checking admin role for:', user, 'Is admin:', isAdminUser);
    return isAdminUser;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminStatus = await checkAdminRole(user);
        setUser(user);
        setIsAdmin(adminStatus);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, isAdmin: adminStatus }));
      } else {
        setUser(null);
        setIsAdmin(false);
        await AsyncStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Check for stored user on app start
    const checkStoredUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAdmin(parsedUser.isAdmin || false);
      }
      setLoading(false);
    };

    checkStoredUser();

    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const value = {
    user,
    isAdmin,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
