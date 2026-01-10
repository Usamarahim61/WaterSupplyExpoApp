import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA2HpyYsw206ngoYOWIHOBtFQ5P-VmOT3A",
  authDomain: "watersupplyapp-4d551.firebaseapp.com",
  projectId: "watersupplyapp-4d551",
  storageBucket: "watersupplyapp-4d551.firebasestorage.app",
  messagingSenderId: "989142996968",
  appId: "1:989142996968:android:60cf5a656e445003d0f65d" // Replace with actual web app ID from Firebase console
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
