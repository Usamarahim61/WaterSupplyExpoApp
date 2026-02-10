import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, ScrollView as RNScrollView, useWindowDimensions, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, where, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AdminDashboard({ navigation }) {
  const { logout, user } = useAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();



  // State for staff and customers data
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaffCustomers, setSelectedStaffCustomers] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedStaffRevenue, setSelectedStaffRevenue] = useState({});
  const [revenueModalVisible, setRevenueModalVisible] = useState(false);
  const [selectedStaffHistory, setSelectedStaffHistory] = useState({});
  const [pendingBills, setPendingBills] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(1000);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [autoBillGeneration, setAutoBillGeneration] = useState(false);
  const [autoBillModalVisible, setAutoBillModalVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      // Clear data when user logs out
      setStaff([]);
      setCustomers([]);
      setBills([]);
      setStaffAssignments([]);
      return;
    }

    const unsubscribes = [];

    const staffUnsubscribe = onSnapshot(collection(db, "staff"), (snapshot) => {
      const staffData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStaff(staffData);
    });
    unsubscribes.push(staffUnsubscribe);

    const customersUnsubscribe = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customersData);
    });
    unsubscribes.push(customersUnsubscribe);

    const billsUnsubscribe = onSnapshot(collection(db, "bills"), (snapshot) => {
      const billsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBills(billsData);
    });
    unsubscribes.push(billsUnsubscribe);

    const settingsUnsubscribe = onSnapshot(collection(db, "settings"), (snapshot) => {
      if (!snapshot.empty) {
        const settingsData = snapshot.docs[0].data();
        setFixedPrice(settingsData.fixedPrice || 1000);
        setAutoBillGeneration(settingsData.autoBillGeneration || false);
      } else {
        setFixedPrice(1000);
        setAutoBillGeneration(false);
      }
    });
    unsubscribes.push(settingsUnsubscribe);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Process staff assignments, revenue, and pending bills when staff, customers, or bills change
  useEffect(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const assignments = staff.map((staffMember) => {
      const assignedCustomers = customers.filter(
        (customer) => customer.assignedTo === staffMember.uid
      );

      // Calculate current month revenue
      const currentMonthRevenue = assignedCustomers.reduce((total, customer) => {
        const customerBills = bills.filter(bill => bill.customerId === customer.id && bill.status === 'paid');
        const currentMonthBills = customerBills.filter(bill => {
          const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        });
        return total + currentMonthBills.reduce((sum, bill) => sum + bill.amount, 0);
      }, 0);

      // Calculate monthly revenue history
      const monthlyHistory = {};
      assignedCustomers.forEach(customer => {
        const customerBills = bills.filter(bill => bill.customerId === customer.id && bill.status === 'paid');
        customerBills.forEach(bill => {
          const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
          const monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyHistory[monthKey]) {
            monthlyHistory[monthKey] = 0;
          }
          monthlyHistory[monthKey] += bill.amount;
        });
      });

      return {
        ...staffMember,
        customerCount: assignedCustomers.length,
        customers: assignedCustomers,
        currentRevenue: currentMonthRevenue,
        monthlyHistory,
      };
    });
    setStaffAssignments(assignments);

    // Calculate pending bills using the fixed price from backend
    const pendingAmount = customers.length * fixedPrice;
    setPendingBills(pendingAmount);
  }, [staff, customers, bills, fixedPrice]);

  const handleNavigation = (navigate) => {
    navigation.navigate(navigate);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout },
      ]
    );
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Connection number copied to clipboard');
  };

  const handleGenerateBills = async () => {
    if (customers.length === 0) {
      Alert.alert('No Customers', 'There are no customers to generate bills for.');
      return;
    }

    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter customers who don't have bills for the current month
    const customersWithoutCurrentMonthBill = customers.filter(customer => {
      // Check if customer has any bills for the current month
      const customerBills = bills.filter(bill => bill.customerId === customer.id);
      const hasCurrentMonthBill = customerBills.some(bill => {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
      });
      return !hasCurrentMonthBill;
    });

    if (customersWithoutCurrentMonthBill.length === 0) {
      Alert.alert(
        'All Bills Generated',
        'All customers already have bills generated for the current month.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Generate Bills',
      `Generate bills for ${customersWithoutCurrentMonthBill.length} customers at Rs.${fixedPrice} each?\n\n${customers.length - customersWithoutCurrentMonthBill.length} customers already have bills for this month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const billsToCreate = customersWithoutCurrentMonthBill.map(customer => ({
                customerId: customer.id,
                amount: fixedPrice,
                status: 'pending',
                billDate: new Date(),
                paymentDate: null,
                notes: `Monthly bill generated on ${new Date().toLocaleDateString()}`
              }));

              // Create all bills in batch
              const promises = billsToCreate.map(bill =>
                addDoc(collection(db, "bills"), bill)
              );

              await Promise.all(promises);

              Alert.alert('Success', `Generated ${customersWithoutCurrentMonthBill.length} bills successfully!`);
            } catch (error) {
              console.error('Error generating bills:', error);
              Alert.alert('Error', 'Failed to generate bills. Please try again.');
            }
          }
        }
      ]
    );
  };

  const saveNewPrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.');
      return;
    }

    try {
      const settingsRef = collection(db, "settings");
      const settingsSnapshot = await getDocs(settingsRef);

      if (!settingsSnapshot.empty) {
        // Update existing settings document
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(settingsDoc.ref, { fixedPrice: price });
      } else {
        // Create new settings document
        await addDoc(settingsRef, { fixedPrice: price });
      }

      setFixedPrice(price);
      setEditModalVisible(false);
      setNewPrice('');
      Alert.alert('Success', 'Fixed price updated successfully.');
    } catch (error) {
      console.error('Error updating price:', error);
      Alert.alert('Error', 'Failed to update price. Please try again.');
    }
  };

  const toggleAutoBillGeneration = async () => {
    try {
      const settingsRef = collection(db, "settings");
      const settingsSnapshot = await getDocs(settingsRef);

      const newValue = !autoBillGeneration;

      if (!settingsSnapshot.empty) {
        // Update existing settings document
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(settingsDoc.ref, { autoBillGeneration: newValue });
      } else {
        // Create new settings document
        await addDoc(settingsRef, { autoBillGeneration: newValue, fixedPrice: fixedPrice });
      }

      setAutoBillGeneration(newValue);
      setAutoBillModalVisible(false);
      Alert.alert('Success', `Auto bill generation ${newValue ? 'enabled' : 'disabled'} successfully.`);
    } catch (error) {
      console.error('Error toggling auto bill generation:', error);
      Alert.alert('Error', 'Failed to update auto bill generation setting. Please try again.');
    }
  };

  const StatCard = ({ title, value, icon, gradient, onPress, delay = 0 }) => {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient colors={gradient} style={styles.statCardGradient}>
          <View style={styles.flexRow}>
            <View style={styles.statIconContainer}>
              <Ionicons name={icon} size={32} color="#fff" />
            </View>
            <Text style={styles.statValue}>{value}</Text>
          </View>
          <Text style={styles.statTitle}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const ActionCard = ({ icon, title, subtitle, onPress, color = '#0047AB', delay = 0 }) => {
    return (
      <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const StaffAssignmentCard = ({ item, delay = 0 }) => {
    const handlePress = () => {
      setSelectedStaffName(item.name);
      setSelectedStaffCustomers(item.customers);
      setModalVisible(true);
    };

    const handleRevenuePress = () => {
      setSelectedStaffName(item.name);
      setSelectedStaffHistory(item.monthlyHistory);
      setRevenueModalVisible(true);
    };

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#fff', '#f8fafc']} style={styles.assignmentCardGradient}>
          <View style={styles.assignmentHeader}>
            <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.staffAvatar}>
              <Text style={styles.staffAvatarText}>{item.name.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.assignmentInfo}>
              <Text style={styles.staffName}>{item.name}</Text>
              <Text style={styles.customerCount}>{item.customerCount} customers assigned</Text>
              <Text style={styles.revenueText}>Current Month: Rs.{item.currentRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.assignmentActions}>
              <TouchableOpacity
                style={styles.revenueButton}
                onPress={handleRevenuePress}
              >
                <Ionicons name="cash-outline" size={20} color="#10b981" />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={24} color="#64748b" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f0f9ff',
    },
    bubble: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
      zIndex: 0,
    },
    header: {
      marginTop: screenHeight * 0.05,
      marginHorizontal: screenWidth * 0.05,
      marginBottom: screenHeight * 0.02,
    },
    headerGradient: {
      borderRadius: screenWidth * 0.05,
      padding: screenWidth * 0.05,
      elevation: 8,
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      borderBottomLeftRadius: 50,
      borderBottomRightRadius: 50,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: screenWidth * 0.06,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: screenHeight * 0.005,
    },
    headerSubtitle: {
      fontSize: screenWidth * 0.035,
      color: '#e0f2fe',
      opacity: 0.9,
    },
    logoutButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    section: {
      marginHorizontal: screenWidth * 0.05,
      marginBottom: screenHeight * 0.0375,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 16,
      marginLeft: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    statCard: {
      width: (screenWidth - screenWidth * 0.1 - 20) / 2, // Two cards per row with margins
      marginBottom: screenHeight * 0.02,
      borderRadius: screenWidth * 0.04,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    statCardGradient: {
      padding: 20,
      borderRadius: 16,
      // alignItems: 'center',
    },
    flexRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      // marginRight: 16,
    },
    statContent: {
      flex: 1,
    },
    statValue: {
      fontSize: screenWidth * 0.05,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: screenHeight * 0.005,
    },
    statTitle: {
      fontSize: screenWidth * 0.03,
      color: '#e0f2fe',
      opacity: 0.9,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statArrow: {
      opacity: 0.8,
    },
    actionsContainer: {
      gap: 12,
    },
    actionCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    actionIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: 4,
    },
    actionSubtitle: {
      fontSize: 14,
      color: '#64748b',
    },
    activityContainer: {
      gap: 12,
    },
    activityItem: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: '#1e293b',
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      color: '#64748b',
    },
    assignmentsContainer: {
      gap: 12,
    },
    assignmentCard: {
      borderRadius: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    assignmentCardGradient: {
      borderRadius: 16,
      padding: 20,
    },
    assignmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    staffAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    staffAvatarText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 22,
    },
    assignmentInfo: {
      flex: 1,
    },
    staffName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 4,
    },
    customerCount: {
      fontSize: 14,
      color: '#64748b',
    },
    revenueText: {
      fontSize: 12,
      color: '#10b981',
      fontWeight: '600',
      marginTop: 2,
    },
    assignmentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    revenueButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: '#f0fdf4',
      borderWidth: 1,
      borderColor: '#dcfce7',
    },
    customerList: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      gap: 8,
    },
    customerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      justifyContent: 'space-between',
    },
    customerInfo: {
      flex: 1,
      marginLeft: 8,
    },
    customerName: {
      fontSize: 14,
      fontWeight: '500',
      color: '#1e293b',
      marginBottom: 2,
    },
    customerId: {
      fontSize: 12,
      color: '#64748b',
    },
    customerPhone: {
      fontSize: 12,
      color: '#64748b',
    },
    customerCnic: {
      fontSize: 12,
      color: '#64748b',
    },
    copyButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: '#f1f5f9',
    },
    noCustomers: {
      fontSize: 14,
      color: '#64748b',
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
    },
    noAssignments: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: screenHeight * 0.15, // Responsive height
      paddingHorizontal: 40,
    },
    noAssignmentsText: {
      fontSize: 16,
      color: '#64748b',
      marginTop: 16,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: screenWidth * 0.9, // Responsive width
      maxHeight: screenHeight * 0.8, // Responsive height
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      flex: 1,
    },
    closeButton: {
      padding: 8,
    },
    modalBody: {
      padding: 20,
      maxHeight: screenHeight * 0.5, // Responsive height
    },
    modalLabel: {
      fontSize: 16,
      color: '#64748b',
      marginBottom: 16,
    },
    priceInput: {
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20,
      color: '#1e293b',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
    },
    cancelButton: {
      backgroundColor: '#f1f5f9',
    },
    saveButton: {
      backgroundColor: '#0047AB',
    },
    cancelButtonText: {
      color: '#64748b',
      fontSize: 16,
      fontWeight: '600',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    revenueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    revenueInfo: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    revenueMonth: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1e293b',
    },
    revenueAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#10b981',
    },
    noRevenue: {
      fontSize: 14,
      color: '#64748b',
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
    },
    billStatusContainer: {
      marginTop: 4,
    },
    billStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>🌊 WaterFlow Admin</Text>
                <Text style={styles.headerSubtitle}>Smart Water Supply Management</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Customers"
              value={customers.length.toString()}
              icon="people"
              gradient={['#0047AB', '#0284c7']}
              onPress={() => handleNavigation('ManageCustomers')}
            />
            <StatCard
              title="Active Staff"
              value={staff.length.toString()}
              icon="person"
              gradient={['#06b6d4', '#0891b2']}
              onPress={() => handleNavigation('ManageStaff')}
            />
            <StatCard
              title="Pending Bills"
              value={`Rs.${bills.filter(bill => bill.status === 'pending' || bill.status === 'not paid').reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}`}
              icon="document-text"
              gradient={['#f59e0b', '#d97706']}
              onPress={() => navigation.navigate('PendingBills')}
            />
            <StatCard
              title="Revenue"
              value={`Rs.${bills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}`}
              icon="cash"
              gradient={['#10b981', '#059669']}
              // onPress={() => navigation.navigate('')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsContainer}>
            {/* <ActionCard
              icon="person-add"
              title="Add Customer"
              subtitle="Register new customer"
              color="#0047AB"
            /> */}
            {/* <ActionCard
              icon="people"
              title="Manage Staff"
              subtitle="Add, edit, and manage staff"
              onPress={() => handleNavigation('ManageStaff')}
              color="#06b6d4"
            /> */}
            <ActionCard
              icon="receipt"
              title="Generate Bills"
              subtitle="Create monthly invoices"
              onPress={handleGenerateBills}
              color="#10b981"
            />
            <ActionCard
              icon="list"
              title="Assign Tasks"
              subtitle="Manage staff assignments"
              onPress={() => handleNavigation('AssignCustomers')}
              color="#f59e0b"
            />
            <ActionCard
              icon="pencil"
              title="Edit Fixed Price"
              subtitle={`Current: Rs.${fixedPrice}`}
              onPress={() => setEditModalVisible(true)}
              color="#8b5cf6"
            />
            <ActionCard
              icon="time-outline"
              title="Auto Bill Generation"
              subtitle={autoBillGeneration ? 'Enabled - Bills generate on 1st of every month' : 'Disabled - Manual generation only'}
              onPress={() => setAutoBillModalVisible(true)}
              color="#10b981"
            />
            <ActionCard
              icon="document-text"
              title="Manage Bills"
              subtitle="View and delete current month bills"
              onPress={() => handleNavigation('ManageBills')}
              color="#ef4444"
            />
            {/* <ActionCard
              icon="analytics"
              title="Reports"
              subtitle="View detailed analytics"
              color="#ef4444"
            /> */}
          </View>
        </View>

        {/* Staff Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Staff Assignments</Text>
          <View style={styles.assignmentsContainer}>
            {staffAssignments.length > 0 ? (
              staffAssignments.map((item, index) => (
                <StaffAssignmentCard key={item.id} item={item} />
              ))
            ) : (
              <View style={styles.noAssignments}>
                <Ionicons name="people" size={48} color="#cbd5e1" />
                <Text style={styles.noAssignmentsText}>No staff assignments yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Activity</Text>
          <View style={styles.activityContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="person-add" size={20} color="#10b981" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New customer registered</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="receipt" size={20} color="#0047AB" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Monthly bills generated</Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Payment received</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View> */}
      </ScrollView>

      {/* Modal for Assigned Customers */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStaffName}'s Assigned Customers
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <RNScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 50 }}>
              {selectedStaffCustomers && selectedStaffCustomers.length > 0 ? (
                selectedStaffCustomers.map((customer) => {
                  const currentDate = new Date();
                  const currentMonth = currentDate.getMonth();
                  const currentYear = currentDate.getFullYear();

                  const customerBills = bills.filter(bill => bill.customerId === customer.id);
                  const currentMonthBill = customerBills.find(bill => {
                    const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
                    return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
                  });

                  const billStatus = currentMonthBill ? currentMonthBill.status : 'no bill';
                  const statusColor = billStatus === 'paid' ? '#10b981' : billStatus === 'pending' ? '#f59e0b' : '#ef4444';
                  const statusText = billStatus === 'paid' ? 'Paid' : billStatus === 'pending' ? 'Pending' : 'No Bill';

                  return (
                    <View key={customer.id} style={styles.customerItem}>
                      <Ionicons name="person" size={16} color="#0047AB" />
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        <Text style={styles.customerId}>ID: {customer.connection}</Text>
                        <Text style={styles.customerPhone}>Phone: {customer.phone || 'N/A'}</Text>
                        <Text style={styles.customerCnic}>CNIC: {customer.cnic || 'N/A'}</Text>
                        <View style={styles.billStatusContainer}>
                          <Text style={[styles.billStatusText, { color: statusColor }]}>
                            Current Month: {statusText}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={() => copyToClipboard(customer.connection)}
                      >
                        <Ionicons name="copy-outline" size={16} color="#0047AB" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noCustomers}>No customers assigned</Text>
              )}
            </RNScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Price Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Fixed Price</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Current Price: Rs.{fixedPrice}</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Enter new price"
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholderTextColor="#64748b"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveNewPrice}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto Bill Generation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={autoBillModalVisible}
        onRequestClose={() => setAutoBillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto Bill Generation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setAutoBillModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Current Status: {autoBillGeneration ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.modalLabel}>
                When enabled, bills will be automatically generated for all customers on the 1st day of every month at midnight.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAutoBillModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={toggleAutoBillGeneration}
                >
                  <Text style={styles.saveButtonText}>
                    {autoBillGeneration ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
