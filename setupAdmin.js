import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfigNode.js';

const setupAdmin = async () => {
  try {
    // Create the admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, 'usamarahim61@gmail.com', 'Admin@123');
    const user = userCredential.user;

    console.log('Admin user created successfully in Firebase Auth!');
    console.log('User ID:', user.uid);
    console.log('Email: usamarahim61@gmail.com');
    console.log('Password: Admin@123');

    // Try to add user data to Firestore (may fail due to security rules)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: 'usamarahim61@gmail.com',
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('Admin user data added to Firestore successfully!');
    } catch (firestoreError) {
      console.log('Note: Firestore write failed (likely due to security rules).');
      console.log('The user can still authenticate, but you may need to manually add admin role to Firestore.');
      console.log('Firestore Error:', firestoreError.message);
    }

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists in Firebase Auth.');
      console.log('You can use the existing account to login.');
      console.log('Email: usamarahim61@gmail.com');
      console.log('Password: Admin@123 (if you remember it)');
    } else {
      console.error('Error creating admin user:', error);
    }
  }
};

setupAdmin();
