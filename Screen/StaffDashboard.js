import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, where, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function StaffDashboard({ navigation }) {
  const { user, logout } = useAuth();

  // State for staff data and assigned customers
  const [staffData, setStaffData] = useState(null);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [customerBills, setCustomerBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pending', 'paid'

  useEffect(() => {
    if (!user) {
      // Clear all data when user logs out
      setStaffData(null);
      setAssignedCustomers([]);
      setCustomerBills([]);
      setLoading(false);
      return;
    }

    // Fetch staff data
    const staffQuery = query(
      collection(db, "staff"),
      where("email", "==", user.email)
    );

    const staffUnsubscribe = onSnapshot(staffQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const staff = snapshot.docs[0].data();
        staff.id = snapshot.docs[0].id;
        setStaffData(staff);

        // Fetch customers assigned to this staff after staff data is loaded using database-level querying
        const q = query(collection(db, "customers"), where("assignedTo", "==", staff.uid));
        const querySnapshot = await getDocs(q);
        const assignedCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssignedCustomers(assignedCustomers);
      }
    });

    return () => {
      staffUnsubscribe();
    };
  }, [user]);

  // Fetch bills for assigned customers using database-level querying
  useEffect(() => {
    if (assignedCustomers.length === 0) {
      setCustomerBills([]);
      setLoading(false);
      return;
    }

    const assignedCustomerIds = assignedCustomers.map(c => c.id);
    const billsQuery = query(collection(db, "bills"));

    const billsUnsubscribe = onSnapshot(billsQuery, (snapshot) => {
      const allBills = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const assignedBills = allBills.filter(bill => assignedCustomerIds.includes(bill.customerId));
      setCustomerBills(assignedBills);
      setLoading(false);
    });

    return () => {
      billsUnsubscribe();
    };
  }, [assignedCustomers]);

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

  const handleMarkAsPaid = async (billId, customerName) => {
    Alert.alert(
      'Mark as Paid',
      `Mark bill as paid for ${customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              const billRef = doc(db, "bills", billId);
              await updateDoc(billRef, {
                status: 'paid',
                paymentDate: new Date()
              });
              Alert.alert('Success', 'Bill marked as paid!');
            } catch (error) {
              console.error('Error updating bill:', error);
              Alert.alert('Error', 'Failed to update bill status');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'not paid': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'not paid': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const StatCard = ({ title, value, icon, gradient, subtitle, onPress }) => {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress}>
        <LinearGradient colors={gradient} style={styles.statCardGradient}>
          <View style={styles.statIconContainer}>
            <Ionicons name={icon} size={32} color="#fff" />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
          <View style={styles.tapIndicator}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const CustomerCard = ({ item }) => {
    // Get bills for this customer
    const customerBillsForThisCustomer = customerBills.filter(bill => bill.customerId === item.id);
    const pendingBills = customerBillsForThisCustomer.filter(bill => bill.status === 'pending' || bill.status === 'not paid');
    const paidBills = customerBillsForThisCustomer.filter(bill => bill.status === 'paid');

    return (
      <View style={styles.customerCard}>
        <LinearGradient colors={['#ffffff', '#f1f5f9']} style={styles.customerCardGradient}>
          <View style={styles.customerHeader}>
            <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{item.name.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.name}</Text>
              <Text style={styles.customerSub}>ID: {item.connectionNo}</Text>
              <Text style={styles.customerPhone}>{item.phone}</Text>
            </View>
          </View>

          <View style={styles.customerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingBills.length}</Text>
              <Text style={styles.statLabel}>Pending Bills</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{paidBills.length}</Text>
              <Text style={styles.statLabel}>Paid Bills</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>
                Rs.{paidBills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
          </View>

          {pendingBills.length > 0 && (
            <View style={styles.pendingBillsSection}>
              <Text style={styles.sectionTitle}>Pending Bills:</Text>
              {pendingBills.map(bill => (
                <View key={bill.id} style={styles.billItem}>
                  <View style={styles.billInfo}>
                    <Text style={styles.billAmount}>Rs.{bill.amount.toLocaleString()}</Text>
                    <Text style={styles.billDate}>
                      {new Date(bill.billDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: getStatusColor(bill.status) }]}
                    onPress={() => handleMarkAsPaid(bill.id, item.name)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.payButtonText}>Mark Paid</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  // Filter customers based on search and filter type
  const getFilteredCustomers = () => {
    let filtered = assignedCustomers;

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.cnic?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.connectionNo?.toLowerCase().includes(searchLower)
      );
    }

    // Apply bill filter
    if (filterType !== 'all') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      filtered = filtered.filter(customer => {
        const customerBillsForThisCustomer = customerBills.filter(bill => bill.customerId === customer.id);
        const currentMonthBills = customerBillsForThisCustomer.filter(bill => {
          const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        });

        if (filterType === 'pending') {
          return currentMonthBills.some(bill => bill.status === 'pending' || bill.status === 'not paid');
        } else if (filterType === 'paid') {
          return currentMonthBills.some(bill => bill.status === 'paid');
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredCustomers = getFilteredCustomers();

  const totalAssigned = assignedCustomers.length;
  const totalCollected = customerBills.filter(bill => bill.status === 'paid').length;
  const totalAmount = customerBills
    .filter(bill => bill.status === 'paid')
    .reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>👷 Staff Dashboard</Text>
                <Text style={styles.headerSubtitle}>
                  Welcome back, {staffData?.name || user?.email}
                </Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Assigned Customers"
              value={totalAssigned.toString()}
              icon="people"
              gradient={['#0047AB', '#0284c7']}
            />
            <StatCard
              title="Revenue"
              value={`Rs.${totalAmount.toLocaleString()}`}
              icon="cash"
              gradient={['#10b981', '#059669']}
            />
            <StatCard
              title="Pending Bills"
              value={`Rs.${customerBills.filter(bill => bill.status === 'pending' || bill.status === 'not paid').reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}`}
              icon="time"
              gradient={['#f59e0b', '#d97706']}
            />
            <StatCard
              title="Bills Collected"
              value={totalCollected.toString()}
              icon="checkmark-circle"
              gradient={['#ef4444', '#dc2626']}
            />
          </View>
        </View>

        {/* Assigned Customers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Your Assigned Customers</Text>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, CNIC, phone, or connection no..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'pending' && styles.filterButtonActive]}
                onPress={() => setFilterType('pending')}
              >
                <Text style={[styles.filterButtonText, filterType === 'pending' && styles.filterButtonTextActive]}>
                  Pending Bills
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'paid' && styles.filterButtonActive]}
                onPress={() => setFilterType('paid')}
              >
                <Text style={[styles.filterButtonText, filterType === 'paid' && styles.filterButtonTextActive]}>
                  Paid Bills
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.customersContainer}>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} item={customer} />
              ))
            ) : (
              <View style={styles.noCustomers}>
                <Ionicons name="people" size={48} color="#cbd5e1" />
                <Text style={styles.noCustomersText}>
                  {assignedCustomers.length > 0 ? 'No customers match your search' : 'No customers assigned yet'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    width: '48%',
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
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
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
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#e0f2fe',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 2,
  },
  customersContainer: {
    gap: 16,
  },
  customerCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  customerCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerSub: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  pendingBillsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
    color: '#64748b',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  noCustomers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noCustomersText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0047AB',
    borderColor: '#0047AB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});
