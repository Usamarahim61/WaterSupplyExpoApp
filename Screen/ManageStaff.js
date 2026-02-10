import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../AuthContext';

const { width, height } = Dimensions.get('window');

export default function ManageStaff({ navigation }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;

  // Form State
  const [staffData, setStaffData] = useState({
    name: '',
    email: '',
    password: '',
    cnic: '',
    phone: '',
    address: '',
  });

  // Firebase Data
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      // Only set up snapshot listener if user is authenticated
      unsubscribe = onSnapshot(collection(db, "staff"), (snapshot) => {
        const staffData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStaff(staffData);
        setLoading(false);
      });
    } else {
      // Clear data when user logs out
      setStaff([]);
      setLoading(false);
    }

    // Animation setup
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Wave animations
    const animateWaves = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateWaves();

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Open Modal for New Entry
  const openAddModal = () => {
    setIsEditing(false);
    setStaffData({ name: '', email: '', password: '', cnic: '', phone: '', address: '' });
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Open Modal for Editing
  const openEditModal = (item) => {
    setIsEditing(true);
    setSelectedStaffId(item.id);
    setStaffData({
      name: item.name,
      email: item.email.toLowerCase(),
      password: '', // Don't populate password for editing
      cnic: item.cnic,
      phone: item.phone,
      address: item.address,
    });
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Close Modal
  const closeModal = () => {
    Animated.spring(modalAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  // Handle Save (Both Create and Update)
  const handleSaveStaff = async () => {
    if (!staffData.name || !staffData.email || (!isEditing && !staffData.password)) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      if (isEditing) {
        // Update existing in Firestore
        const staffRef = doc(db, "staff", selectedStaffId);
        await updateDoc(staffRef, {
          name: staffData.name,
          email: staffData.email,
          cnic: staffData.cnic,
          phone: staffData.phone,
          address: staffData.address,
        });
        Alert.alert("Success", "Staff updated successfully");
      } else {
        // Store current admin credentials before creating staff user
        const currentUser = auth.currentUser;
        let adminEmail = null;
        let adminPassword = null;

        if (currentUser && currentUser.email === 'usamarahim61@gmail.com') {
          // This is the admin, we need to sign them back in after creating staff
          adminEmail = currentUser.email;
          // We don't have the password stored, so we'll need to handle this differently
          // For now, let's create the staff user and then try to sign back in the admin
        }

        // Create Firebase Auth user for staff
        const userCredential = await createUserWithEmailAndPassword(auth, staffData.email, staffData.password);
        const uid = userCredential.user.uid;

        // Save to Firestore
        await addDoc(collection(db, "staff"), {
          name: staffData.name,
          email: staffData.email,
          cnic: staffData.cnic,
          phone: staffData.phone,
          address: staffData.address,
          uid: uid,
          role: 'staff', // Assuming role is staff
          status: 'Active',
          createdAt: new Date(),
        });

        // If admin was logged in, we need to sign them back in
        // Since we don't have the admin password stored, we'll need to handle this differently
        // For now, the admin will be signed out and need to log back in manually
        // This is a security measure to prevent automatic re-authentication

        Alert.alert("Success", "Staff registered successfully. Please log back in as admin.");
      }

      closeModal();
      setStaffData({ name: '', email: '', password: '', cnic: '', phone: '', address: '' });
    } catch (error) {
      console.error("Error saving staff:", error);
      Alert.alert("Error", error.message);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Staff",
      "Are you sure you want to remove this staff record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const staffRef = doc(db, "staff", id);
              await deleteDoc(staffRef);
              Alert.alert("Success", "Staff deleted successfully");
            } catch (error) {
              console.error("Error deleting staff:", error);
              Alert.alert("Error", "Failed to delete staff. Please try again.");
            }
          },
        }
      ]
    );
  };

  // Handle Status Toggle
  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const staffRef = doc(db, "staff", id);
      await updateDoc(staffRef, { status: newStatus });
      Alert.alert("Success", `Staff status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating staff status:", error);
      Alert.alert("Error", "Failed to update staff status. Please try again.");
    }
  };

  // Handle Password Reset
  const handlePasswordReset = async (email) => {
    Alert.alert(
      "Reset Password",
      `Send password reset email to ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reset Email",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert("Success", "Password reset email sent successfully!");
            } catch (error) {
              console.error("Error sending password reset email:", error);
              Alert.alert("Error", "Failed to send password reset email. Please try again.");
            }
          },
        }
      ]
    );
  };

  // Filter List based on Search and Status
  const filteredStaff = staff.filter(
    (c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && c.status === 'Active') ||
        (filterStatus === 'inactive' && c.status === 'Inactive');
      return matchesSearch && matchesStatus;
    }
  );

  const StaffCard = ({ item, delay = 0 }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }, []);

    return (
      <Animated.View
        style={{
          transform: [{ scale: cardAnim }],
          opacity: cardAnim,
        }}
      >
        <TouchableOpacity style={styles.staffCard} activeOpacity={0.8}>
          <LinearGradient
            colors={["#ffffff", "#f1f5f9", "#e2e8f0"]}
            style={styles.staffCardGradient}
          >
            <View style={styles.staffInfo}>
              <LinearGradient
                colors={["#0047AB", "#0284c7"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </LinearGradient>
              <View style={styles.staffDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.statusText}>{item.status || 'Active'}</Text>
                  </View>
                </View>
                <Text style={styles.staffSub}>{item.email}</Text>
                <Text style={styles.staffPhone}>{item.phone}</Text>
                {item.createdAt && (
                  <Text style={styles.staffDate}>
                    Joined: {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.actionButtons}>
              {/* <TouchableOpacity
                style={[styles.iconBtn, styles.viewBtn]}
                onPress={() => navigation.navigate('StaffDashboard', { staff: item })}
              >
                <Ionicons name="eye-outline" size={20} color="#10b981" />
              </TouchableOpacity> */}
              <TouchableOpacity
                style={[styles.iconBtn, styles.editBtn]}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color="#0047AB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.resetBtn]}
                onPress={() => handlePasswordReset(item.email)}
              >
                <Ionicons name="key-outline" size={20} color="#8b5cf6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, item.status === 'Active' ? styles.deactivateBtn : styles.activateBtn]}
                onPress={() => handleStatusToggle(item.id, item.status)}
              >
                <Ionicons
                  name={item.status === 'Active' ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={item.status === 'Active' ? "#f59e0b" : "#10b981"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people" size={80} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>No Staff Yet</Text>
      <Text style={styles.emptySubtitle}>Start by adding your first staff member to the system</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
        <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.emptyButtonGradient}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Add First Staff</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Background Waves */}
      <Animated.View
        style={[
          styles.wave1,
          {
            transform: [
              {
                translateX: waveAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width, width],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={['rgba(14, 165, 233, 0.15)', 'rgba(56, 189, 248, 0.08)']} style={styles.waveShape} />
      </Animated.View>

      <Animated.View
        style={[
          styles.wave2,
          {
            transform: [
              {
                translateX: waveAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, -width],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={['rgba(6, 182, 212, 0.12)', 'rgba(14, 165, 233, 0.06)']} style={styles.waveShape} />
      </Animated.View>

      {/* Header */}
      <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Staff</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#64748b" />
          </View>
          <TextInput
            placeholder="Search by Name or Email"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#64748b"
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearch('')}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity onPress={() => setFilterStatus('all')} style={styles.statItemTouchable}>
            <LinearGradient
              colors={filterStatus === 'all' ? ["#0047AB", "#0284c7"] : ["#64748b", "#475569"]}
              style={styles.statItem}
            >
              <Ionicons name="people" size={32} color="#fff" />
              <Text style={styles.statNumberWhite}>{staff.length}</Text>
              <Text style={styles.statLabelWhite}>Total Staff</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterStatus('active')} style={styles.statItemTouchable}>
            <LinearGradient
              colors={filterStatus === 'active' ? ["#10b981", "#059669"] : ["#64748b", "#475569"]}
              style={styles.statItem}
            >
              <Ionicons name="checkmark-circle" size={32} color="#fff" />
              <Text style={styles.statNumberWhite}>
                {staff.filter((s) => s.status === "Active").length}
              </Text>
              <Text style={styles.statLabelWhite}>Active</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterStatus('inactive')} style={styles.statItemTouchable}>
            <LinearGradient
              colors={filterStatus === 'inactive' ? ["#ef4444", "#dc2626"] : ["#64748b", "#475569"]}
              style={styles.statItem}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
              <Text style={styles.statNumberWhite}>
                {staff.filter((s) => s.status === "Inactive").length}
              </Text>
              <Text style={styles.statLabelWhite}>Inactive</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={filteredStaff}
          renderItem={({ item, index }) => (
            <StaffCard item={item} delay={index * 100} />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={search.length > 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color="#cbd5e1" />
              <Text style={styles.noResultsText}>No staff found</Text>
              <Text style={styles.noResultsSubtext}>Try adjusting your search terms</Text>
            </View>
          ) : (
            <EmptyState />
          )}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Add/Edit Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeModal}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#0047AB", "#0284c7"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Staff" : "Register New Staff"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter full name"
                    placeholderTextColor="#64748b"
                    value={staffData.name}
                    onChangeText={(val) => setStaffData({...staffData, name: val})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="staff@example.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={staffData.email}
                    onChangeText={(val) => setStaffData({...staffData, email: val.toLowerCase()})}
                  />
                </View>

                {!isEditing && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      value={staffData.password}
                      onChangeText={(val) => setStaffData({...staffData, password: val})}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CNIC Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="42101-XXXXXXX-X"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={staffData.cnic}
                    onChangeText={(val) => setStaffData({...staffData, cnic: val})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="03XX-XXXXXXX"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={staffData.phone}
                    onChangeText={(val) => setStaffData({...staffData, phone: val})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Home Address</Text>
                  <TextInput
                    style={[styles.modalInput, styles.addressInput]}
                    placeholder="Enter full address"
                    placeholderTextColor="#64748b"
                    multiline
                    textAlignVertical="top"
                    value={staffData.address}
                    onChangeText={(val) => setStaffData({...staffData, address: val})}
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSaveStaff}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#0047AB", "#0284c7"]}
                    style={styles.submitGradient}
                  >
                    <Text style={styles.submitBtnText}>
                      {isEditing ? "Update Staff" : "Register Staff"}
                    </Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  wave1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height * 0.3,
  },
  wave2: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height * 0.25,
  },
  waveShape: {
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width * 0.05,
    paddingTop: height * 0.06,
        borderBottomLeftRadius: width * 0.075,
    borderBottomRightRadius: width * 0.075,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  flex: {
    flexDirection: "column",
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statTextContainer: {
    marginLeft: 12,
  },
  statNumberWhite: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabelWhite: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: width * 0.05,
    borderRadius: width * 0.04,
    height: height * 0.07,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: 'wrap',
    justifyContent: "space-around",
    marginHorizontal: width * 0.02,
    marginBottom: height * 0.025,
  },
  statItem: {
    // flex: 1,
 width: (width - width * 0.20) / 3,
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: width * 0.005,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    padding: Math.max(4, width * 0.01),
  },
  statItemTouchable: {
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0047AB',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  staffCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  staffCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  staffInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  staffDetails: { flex: 1 },
  staffName: { fontSize: width * 0.045, fontWeight: 'bold', color: '#1e293b' },
  staffSub: { fontSize: width * 0.035, color: '#64748b', marginTop: 2 },
  staffPhone: { fontSize: width * 0.035, color: '#64748b', marginTop: 2 },
  staffDate: { fontSize: width * 0.032, color: '#94a3b8', marginTop: 2 },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fef2f2" },
  statusText: { fontSize: width * 0.03, fontWeight: "600" },
  actionButtons: { flexDirection: 'row' },
  iconBtn: {
    padding: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  viewBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  editBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  activateBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  deactivateBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resetBtn: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin:10
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
  },
  modalHeader: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom:10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
    paddingInline: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 32,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
