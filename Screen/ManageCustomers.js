import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const { width, height } = Dimensions.get("window");

export default function ManageCustomers({ navigation }) {
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;

  // Form State
  const [customerData, setCustomerData] = useState({
    name: "",
    cnic: "",
    phone: "",
    address: "",
    connectionNo: "",
  });

  // Firebase Data
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Firebase operations
  useEffect(() => {
    // Fetch customers from Firebase
    const fetchCustomers = async () => {
      try {
        const customersCollection = collection(db, "customers");
        const unsubscribe = onSnapshot(customersCollection, (snapshot) => {
          const customersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCustomers(customersData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching customers:", error);
        Alert.alert("Error", "Failed to load customers");
        setLoading(false);
      }
    };

    fetchCustomers();

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
  }, []);

  // Open Modal for New Entry
  const openAddModal = () => {
    setIsEditing(false);
    setCustomerData({
      name: "",
      cnic: "",
      phone: "",
      address: "",
      connectionNo: "",
    });
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
    setSelectedCustomerId(item.id);
    setCustomerData({
      name: item.name,
      cnic: item.cnic,
      phone: item.phone,
      address: item.address,
      connectionNo: item.connection,
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
  const handleSaveCustomer = async () => {
    if (!customerData.name || !customerData.connectionNo) {
      Alert.alert("Error", "Please fill in Name and Connection Number");
      return;
    }

    try {
      if (isEditing) {
        // Update existing customer in Firebase
        const customerRef = doc(db, "customers", selectedCustomerId);
        await updateDoc(customerRef, {
          name: customerData.name,
          cnic: customerData.cnic,
          phone: customerData.phone,
          address: customerData.address,
          connection: customerData.connectionNo,
        });
        Alert.alert("Success", "Customer updated successfully");
      } else {
        // Add new customer to Firebase
        await addDoc(collection(db, "customers"), {
          name: customerData.name,
          cnic: customerData.cnic,
          phone: customerData.phone,
          address: customerData.address,
          connection: customerData.connectionNo,
          status: "Active",
          createdAt: new Date(),
        });
        Alert.alert("Success", "Customer added successfully");
      }

      closeModal();
      setCustomerData({
        name: "",
        cnic: "",
        phone: "",
        address: "",
        connectionNo: "",
      });
    } catch (error) {
      console.error("Error saving customer:", error);
      Alert.alert("Error", "Failed to save customer. Please try again.");
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to remove this customer record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const customerRef = doc(db, "customers", id);
              await deleteDoc(customerRef);
              Alert.alert("Success", "Customer deleted successfully");
            } catch (error) {
              console.error("Error deleting customer:", error);
              Alert.alert(
                "Error",
                "Failed to delete customer. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // Filter List based on Search
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.connection.toLowerCase().includes(search.toLowerCase())
  );

  const CustomerCard = ({ item, delay = 0 }) => {
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
        <TouchableOpacity style={styles.customerCard} activeOpacity={0.8}>
          <LinearGradient
            colors={["#ffffff", "#f1f5f9", "#e2e8f0"]}
            style={styles.customerCardGradient}
          >
            <View style={styles.customerInfo}>
              <LinearGradient
                colors={["#0ea5e9", "#0284c7"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </LinearGradient>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerSub}>ID: {item.connection}</Text>
                <Text style={styles.customerPhone}>{item.phone}</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.iconBtn, styles.editBtn]}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color="#0ea5e9" />
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
      <Text style={styles.emptyTitle}>No Customers Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start by adding your first customer to the system
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
        <LinearGradient
          colors={["#0ea5e9", "#0284c7"]}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Add First Customer</Text>
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
        <LinearGradient
          colors={["rgba(14, 165, 233, 0.15)", "rgba(56, 189, 248, 0.08)"]}
          style={styles.waveShape}
        />
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
        <LinearGradient
          colors={["rgba(6, 182, 212, 0.12)", "rgba(14, 165, 233, 0.06)"]}
          style={styles.waveShape}
        />
      </Animated.View>

      {/* Header */}
      <LinearGradient colors={["#0ea5e9", "#0284c7"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Customers</Text>
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
            placeholder="Search by Name or Connection ID"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#64748b"
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearch("")}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={["#0ea5e9", "#0284c7"]}
            style={styles.statItem}
          >
            <View style={styles.flex}>
              <View style={styles.flexRow}>
                <Ionicons name="people" size={24} color="#fff" />
                <Text style={styles.statNumberWhite}>{customers.length}</Text>
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabelWhite}>Total Customers</Text>
              </View>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={["#10b981", "#059669"]}
            style={styles.statItem}
          >
            <View style={styles.flex}>
              <View style={styles.flexRow}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.statNumberWhite}>
                  {customers.filter((c) => c.status === "Active").length}
                </Text>
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabelWhite}>Active</Text>
              </View>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={["#f59e0b", "#d97706"]}
            style={styles.statItem}
          >
            <View style={styles.flex}>
              <View style={styles.flexRow}>
                <Ionicons name="time" size={24} color="#fff" />
                <Text style={styles.statNumberWhite}>
                  {customers.filter((c) => c.status === "Pending").length}
                </Text>
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabelWhite}>Pending</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={({ item, index }) => (
              <CustomerCard item={item} delay={index * 100} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              search.length > 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search" size={48} color="#cbd5e1" />
                  <Text style={styles.noResultsText}>No customers found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try adjusting your search terms
                  </Text>
                </View>
              ) : (
                <EmptyState />
              )
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Add/Edit Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalAnim,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
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
                colors={["#0ea5e9", "#0284c7"]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit Customer" : "Register New Customer"}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalBody}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter full name"
                    placeholderTextColor="#64748b"
                    value={customerData.name}
                    onChangeText={(val) =>
                      setCustomerData({ ...customerData, name: val })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CNIC Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="42101-XXXXXXX-X"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={customerData.cnic}
                    onChangeText={(val) =>
                      setCustomerData({ ...customerData, cnic: val })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="03XX-XXXXXXX"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={customerData.phone}
                    onChangeText={(val) =>
                      setCustomerData({ ...customerData, phone: val })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Connection Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. W-5542"
                    placeholderTextColor="#64748b"
                    value={customerData.connectionNo}
                    onChangeText={(val) =>
                      setCustomerData({ ...customerData, connectionNo: val })
                    }
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
                    value={customerData.address}
                    onChangeText={(val) =>
                      setCustomerData({ ...customerData, address: val })
                    }
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSaveCustomer}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#0ea5e9", "#0284c7"]}
                    style={styles.submitGradient}
                  >
                    <Text style={styles.submitBtnText}>
                      {isEditing ? "Update Customer" : "Register Customer"}
                    </Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  wave1: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height * 0.3,
  },
  wave2: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height * 0.25,
  },
  waveShape: {
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  addBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    height: 56,
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
    color: "#334155",
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    width: "30%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    padding: 16,
  },
  statTextContainer: {
    marginLeft: 12,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0ea5e9",
  },
  statNumberWhite: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  statLabelWhite: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  customerCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  customerCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  customerInfo: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 22 },
  customerDetails: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  customerSub: { fontSize: 14, color: "#64748b", marginTop: 2 },
  customerPhone: { fontSize: 14, color: "#64748b", marginTop: 2 },
  actionButtons: { flexDirection: "row" },
  iconBtn: {
    padding: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  editBtn: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
  },
  modalHeader: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 8,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addressInput: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    marginTop: 32,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
});
