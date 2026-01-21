import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminCredentials, setAdminCredentials] = useState(null);

  const checkUserRole = async (user) => {
    // Check if user is admin
    const isAdminUser = user.email === 'usamarahim61@gmail.com';

    // Check if user is staff
    let isStaffUser = false;
    try {
      const staffQuery = query(
        collection(db, "staff"),
        where("email", "==", user.email)
      );
      const staffSnapshot = await getDocs(staffQuery);
      isStaffUser = !staffSnapshot.empty;
    } catch (error) {
      console.error('Error checking staff role:', error);
    }

    console.log('Checking roles for:', user.email, 'Is admin:', isAdminUser, 'Is staff:', isStaffUser);
    return { isAdmin: isAdminUser, isStaff: isStaffUser };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { isAdmin: adminStatus, isStaff: staffStatus } = await checkUserRole(user);
        setUser(user);
        setIsAdmin(adminStatus);
        setIsStaff(staffStatus);
        await AsyncStorage.setItem('user', JSON.stringify({
          ...user,
          isAdmin: adminStatus,
          isStaff: staffStatus
        }));
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsStaff(false);
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
        setIsStaff(parsedUser.isStaff || false);
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
    isStaff,
    logout,
    loading,
    adminCredentials,
    setAdminCredentials,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
