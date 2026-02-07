import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, where, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
        <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.customerCardGradient}>
          <View style={styles.customerHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.name}</Text>
              <View style={styles.customerDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={screenWidth * 0.035} color="#64748b" />
                  <Text style={styles.customerSub}>ID: {item.connection}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={screenWidth * 0.035} color="#64748b" />
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                </View>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              {pendingBills.length > 0 ? (
                <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="time-outline" size={screenWidth * 0.035} color="#f59e0b" />
                  <Text style={[styles.statusText, { color: '#f59e0b' }]}>Pending</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="checkmark-circle-outline" size={screenWidth * 0.035} color="#10b981" />
                  <Text style={[styles.statusText, { color: '#10b981' }]}>Up to Date</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.customerStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time-outline" size={screenWidth * 0.04} color="#f59e0b" />
              </View>
              <Text style={styles.statNumber}>{pendingBills.length}</Text>
              <Text style={styles.statLabel}>Pending Bills</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="checkmark-circle-outline" size={screenWidth * 0.04} color="#10b981" />
              </View>
              <Text style={styles.statNumber}>{paidBills.length}</Text>
              <Text style={styles.statLabel}>Paid Bills</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="cash-outline" size={screenWidth * 0.04} color="#3b82f6" />
              </View>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>
                Rs.{paidBills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
          </View>

          {pendingBills.length > 0 && (
            <View style={styles.pendingBillsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={screenWidth * 0.04} color="#64748b" />
                <Text style={styles.sectionTitle}>Pending Bills ({pendingBills.length})</Text>
              </View>
              {pendingBills.map(bill => (
                <View key={bill.id} style={styles.billItem}>
                  <View style={styles.billInfo}>
                    <View style={styles.billAmountContainer}>
                      <Ionicons name="cash" size={screenWidth * 0.04} color="#1e293b" />
                      <Text style={styles.billAmount}>Rs.{bill.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.billDateContainer}>
                      <Ionicons name="calendar-outline" size={screenWidth * 0.035} color="#64748b" />
                      <Text style={styles.billDate}>
                        {(() => {
                          try {
                            const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
                            if (isNaN(billDate.getTime())) {
                              return 'Invalid Date';
                            }
                            return billDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            });
                          } catch (error) {
                            return 'Invalid Date';
                          }
                        })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: getStatusColor(bill.status) }]}
                    onPress={() => handleMarkAsPaid(bill.id, item.name)}
                  >
                    <Ionicons name="checkmark" size={screenWidth * 0.04} color="#fff" />
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
        customer.connection?.toLowerCase().includes(searchLower)
      );
    }

    // Apply bill filter
    if (filterType !== 'all') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      filtered = filtered.filter(customer => {
        const customerBillsForThisCustomer = customerBills.filter(bill => bill.customerId === customer.id);

        if (filterType === 'pending') {
          // Show customers with pending bills in current month
          const currentMonthBills = customerBillsForThisCustomer.filter(bill => {
            try {
              const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
              return !isNaN(billDate.getTime()) && billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            } catch (error) {
              return false;
            }
          });
          return currentMonthBills.some(bill => bill.status === 'pending' || bill.status === 'not paid');
        } else if (filterType === 'paid') {
          // Show customers with paid bills in current month
          const currentMonthBills = customerBillsForThisCustomer.filter(bill => {
            try {
              const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
              return !isNaN(billDate.getTime()) && billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            } catch (error) {
              return false;
            }
          });
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: screenHeight * 0.02,
    fontSize: screenWidth * 0.04,
    color: '#64748b',
  },
  header: {
    marginTop: screenHeight * 0.06,
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.025,
  },
  headerGradient: {
    borderRadius: screenWidth * 0.05,
    padding: screenWidth * 0.05,
    elevation: 8,
    shadowColor: '#6366f1',
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
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: screenHeight * 0.005,
  },
  headerSubtitle: {
    fontSize: screenWidth * 0.035,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  logoutButton: {
    padding: screenWidth * 0.02,
    borderRadius: screenWidth * 0.03,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.0375,
  },
  sectionTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
    // marginBottom: screenHeight * 0.02,
    marginLeft: screenWidth * 0.01,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: screenWidth * 0.425,
    marginBottom: screenHeight * 0.02,
    borderRadius: screenWidth * 0.04,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statCardGradient: {
    padding: screenWidth * 0.05,
    borderRadius: screenWidth * 0.04,
    alignItems: 'center',
  },
  statIconContainer: {
    width: screenWidth * 0.125,
    height: screenWidth * 0.125,
    borderRadius: screenWidth * 0.0625,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: screenHeight * 0.015,
  },
  statValue: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: screenHeight * 0.005,
  },
  statTitle: {
    fontSize: screenWidth * 0.03,
    color: '#e0e7ff',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: screenWidth * 0.025,
    color: '#e0e7ff',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: screenHeight * 0.0025,
  },
  tapIndicator: {
    position: 'absolute',
    bottom: screenHeight * 0.01,
    right: screenWidth * 0.025,
    opacity: 0.7,
  },
  customersContainer: {
    gap: screenHeight * 0.02,
  },
  customerCard: {
    borderRadius: screenWidth * 0.04,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  customerCardGradient: {
    borderRadius: screenWidth * 0.04,
    padding: screenWidth * 0.05,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.02,
  },
  customerAvatar: {
    width: screenWidth * 0.14,
    height: screenWidth * 0.14,
    borderRadius: screenWidth * 0.07,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: screenWidth * 0.04,
  },
  customerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: screenWidth * 0.055,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: screenHeight * 0.005,
  },
  customerSub: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
    marginBottom: screenHeight * 0.0025,
  },
  customerPhone: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.02,
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.04,
    backgroundColor: '#f8fafc',
    borderRadius: screenWidth * 0.03,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: screenHeight * 0.005,
  },
  statLabel: {
    fontSize: screenWidth * 0.03,
    color: '#64748b',
    textAlign: 'center',
  },
  pendingBillsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: screenHeight * 0.02,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: screenHeight * 0.01,
    paddingHorizontal: screenWidth * 0.03,
    backgroundColor: '#fefefe',
    borderRadius: screenWidth * 0.02,
    marginBottom: screenHeight * 0.01,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: screenHeight * 0.0025,
  },
  billDate: {
    fontSize: screenWidth * 0.03,
    color: '#64748b',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: screenHeight * 0.01,
    paddingHorizontal: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
  },
  payButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.03,
    fontWeight: '600',
    marginLeft: screenWidth * 0.01,
  },
  noCustomers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.15,
    paddingHorizontal: screenWidth * 0.1,
  },
  noCustomersText: {
    fontSize: screenWidth * 0.04,
    color: '#64748b',
    marginTop: screenHeight * 0.02,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: screenHeight * 0.025,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    marginBottom: screenHeight * 0.02,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: screenWidth * 0.03,
  },
  searchInput: {
    flex: 1,
    fontSize: screenWidth * 0.04,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.02,
    borderRadius: screenWidth * 0.02,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: screenWidth * 0.01,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0047AB',
    borderColor: '#0047AB',
  },
  filterButtonText: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  avatarContainer: {
    marginRight: screenWidth * 0.04,
  },
  customerDetails: {
    marginTop: screenHeight * 0.005,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.0025,
  },
  statusIndicator: {
    position: 'absolute',
    top: screenWidth * 0.025,
    right: screenWidth * 0.025,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.02,
    paddingVertical: screenHeight * 0.005,
    borderRadius: screenWidth * 0.015,
  },
  statusText: {
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
    marginLeft: screenWidth * 0.01,
  },
  statIcon: {
    width: screenWidth * 0.08,
    height: screenWidth * 0.08,
    borderRadius: screenWidth * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: screenHeight * 0.005,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.015,
  },
  billAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.005,
  },
  billDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
