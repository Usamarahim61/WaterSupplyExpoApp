import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, ScrollView as RNScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AdminDashboard({ navigation }) {
  const { logout } = useAuth();

  // State for staff and customers data
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaffCustomers, setSelectedStaffCustomers] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [pendingBills, setPendingBills] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(1000);

  useEffect(() => {
    // Fetch staff and customers data
    const fetchData = async () => {
      try {
        const staffCollection = collection(db, "staff");
        const staffUnsubscribe = onSnapshot(staffCollection, (snapshot) => {
          const staffData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setStaff(staffData);
        });

        const customersCollection = collection(db, "customers");
        const customersUnsubscribe = onSnapshot(customersCollection, (snapshot) => {
          const customersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCustomers(customersData);
        });

        const billsCollection = collection(db, "bills");
        const billsUnsubscribe = onSnapshot(billsCollection, (snapshot) => {
          const billsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setBills(billsData);
        });

        const settingsCollection = collection(db, "settings");
        const settingsUnsubscribe = onSnapshot(settingsCollection, (snapshot) => {
          if (!snapshot.empty) {
            const settingsData = snapshot.docs[0].data();
            setFixedPrice(settingsData.fixedPrice || 1000);
          } else {
            setFixedPrice(1000);
          }
        });

        return () => {
          staffUnsubscribe();
          customersUnsubscribe();
          billsUnsubscribe();
          settingsUnsubscribe();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Process staff assignments and pending bills when staff or customers change
  useEffect(() => {
    const assignments = staff.map((staffMember) => {
      const assignedCustomers = customers.filter(
        (customer) => customer.assignedTo === staffMember.id
      );
      return {
        ...staffMember,
        customerCount: assignedCustomers.length,
        customers: assignedCustomers,
      };
    });
    setStaffAssignments(assignments);

    // Calculate pending bills using the fixed price from backend
    const pendingAmount = customers.length * fixedPrice;
    setPendingBills(pendingAmount);
  }, [staff, customers, fixedPrice]);

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

  const handleGenerateBills = async () => {
    if (customers.length === 0) {
      Alert.alert('No Customers', 'There are no customers to generate bills for.');
      return;
    }

    Alert.alert(
      'Generate Bills',
      `Generate bills for ${customers.length} customers at Rs.${fixedPrice} each?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const billsToCreate = customers.map(customer => ({
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

              Alert.alert('Success', `Generated ${customers.length} bills successfully!`);
            } catch (error) {
              console.error('Error generating bills:', error);
              Alert.alert('Error', 'Failed to generate bills. Please try again.');
            }
          }
        }
      ]
    );
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
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748b" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
              onPress={() => navigation.navigate('ManageCustomers')}
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
              icon="analytics"
              title="Reports"
              subtitle="View detailed analytics"
              color="#ef4444"
            />
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
            <RNScrollView style={styles.modalBody}>
              {selectedStaffCustomers && selectedStaffCustomers.length > 0 ? (
                selectedStaffCustomers.map((customer) => (
                  <View key={customer.id} style={styles.customerItem}>
                    <Ionicons name="person" size={16} color="#0047AB" />
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerId}>ID: {customer.connectionNo}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noCustomers}>No customers assigned</Text>
              )}
            </RNScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
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
    maxWidth: '95%',
    minWidth: '50%',
    marginBottom: 16,
    borderRadius: 16,
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
  flexRow:{
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:"space-between"

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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
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
    paddingVertical: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  customerId: {
    fontSize: 12,
    color: '#64748b',
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
    paddingVertical: 60,
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
    width: '90%',
    maxHeight: '80%',
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
    maxHeight: 400,
  },
});
