import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, useWindowDimensions, Share, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, where, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function StaffDashboard({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { user, logout } = useAuth();

  const styles = getStyles(screenWidth, screenHeight);
  const viewShotRef = useRef();

  // State for staff data and assigned customers
  const [staffData, setStaffData] = useState(null);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [customerBills, setCustomerBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pending', 'paid'
  const [receiptData, setReceiptData] = useState(null);

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

  const generateReceipt = async (customer, paidBills) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const currentMonthPaidBills = paidBills.filter(bill => {
      try {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        return !isNaN(billDate.getTime()) && billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
      } catch (error) {
        return false;
      }
    });

    if (currentMonthPaidBills.length === 0) {
      Alert.alert('No Paid Bills', 'No paid bills found for the current month.');
      return;
    }

    const totalAmount = currentMonthPaidBills.reduce((sum, bill) => sum + bill.amount, 0);

    setReceiptData({
      customer,
      bills: currentMonthPaidBills,
      totalAmount,
      currentDate,
      staffName: staffData?.name || user?.email,
    });
  };

  const shareReceiptAsImage = async () => {
    if (!viewShotRef.current) return;

    try {
      const uri = await viewShotRef.current.capture();

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Receipt for ${receiptData.customer.name}`,
      });

      setReceiptData(null);
    } catch (error) {
      console.error('Error sharing receipt image:', error);
      Alert.alert('Error', 'Failed to share receipt image');
    }
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
            <Ionicons name={icon} size={screenWidth * 0.08} color="#fff" />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
          <View style={styles.tapIndicator}>
            <Ionicons name="chevron-forward" size={screenWidth * 0.04} color="#fff" />
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
            {paidBills.length > 0 && (
              <TouchableOpacity style={styles.statItem} onPress={() => generateReceipt(item, paidBills)}>
                <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="receipt-outline" size={screenWidth * 0.04} color="#8b5cf6" />
                </View>
                <Text style={[styles.statNumber, { color: '#8b5cf6' }]}>Receipt</Text>
                <Text style={styles.statLabel}>Generate</Text>
              </TouchableOpacity>
            )}
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
    const styles = getStyles(screenWidth, screenHeight);
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

      {/* Receipt Modal */}
      <Modal
        visible={!!receiptData}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setReceiptData(null)}
      >
        <View style={styles.modalFullScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setReceiptData(null)}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Payment Receipt</Text>
            <TouchableOpacity
              style={styles.shareButtonHeader}
              onPress={shareReceiptAsImage}
            >
              <Ionicons name="share-outline" size={20} color="#0047AB" />
              <Text style={styles.shareButtonHeaderText}>Share</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.receiptScrollView}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
              <View style={styles.receiptContainer}>
                {/* Header with Logo */}
                <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.receiptHeader}>
                  <View style={styles.receiptHeaderContent}>
                    <View style={styles.receiptLogoContainer}>
                      <Ionicons name="water" size={screenWidth * 0.08} color="#fff" />
                    </View>
                    <View style={styles.receiptTitleContainer}>
                      <Text style={styles.receiptTitle}>Water Supply</Text>
                      <Text style={styles.receiptSubtitle}>Payment Receipt</Text>
                      <Text style={styles.receiptTagline}>Clean Water, Happy Life</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.receiptBody}>
                  {/* Customer Information Section */}
                  <View style={styles.receiptSection}>
                    <View style={styles.receiptSectionHeader}>
                      <Ionicons name="person-circle-outline" size={screenWidth * 0.05} color="#0047AB" />
                      <Text style={styles.receiptSectionHeaderText}>Customer Details</Text>
                    </View>
                    <View style={styles.receiptInfoCard}>
                      <View style={styles.receiptInfoRow}>
                        <Ionicons name="person-outline" size={screenWidth * 0.04} color="#64748b" />
                        <Text style={styles.receiptInfoLabel}>Name:</Text>
                        <Text style={styles.receiptInfoValue}>{receiptData?.customer.name}</Text>
                      </View>
                      <View style={styles.receiptInfoRow}>
                        <Ionicons name="card-outline" size={screenWidth * 0.04} color="#64748b" />
                        <Text style={styles.receiptInfoLabel} numberOfLines={1}>Connection ID:</Text>
                        <Text style={styles.receiptInfoValue} numberOfLines={1}>{receiptData?.customer.connection}</Text>
                      </View>
                      <View style={styles.receiptInfoRow}>
                        <Ionicons name="call-outline" size={screenWidth * 0.04} color="#64748b" />
                        <Text style={styles.receiptInfoLabel}>Phone:</Text>
                        <Text style={styles.receiptInfoValue}>{receiptData?.customer.phone}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Payment Details Section */}
                  <View style={styles.receiptSection}>
                    <View style={styles.receiptSectionHeader}>
                      <Ionicons name="receipt-outline" size={screenWidth * 0.05} color="#0047AB" />
                      <Text style={styles.receiptSectionHeaderText}>
                        Payments for {receiptData?.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </Text>
                    </View>

                    {receiptData?.bills.map((bill, index) => {
                      const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
                      const paymentDate = bill.paymentDate?.toDate ? bill.paymentDate.toDate() : new Date();
                      return (
                        <View key={index} style={styles.receiptBillCard}>
                          <View style={styles.receiptBillHeader}>
                            <View style={styles.receiptBillIcon}>
                              <Ionicons name="calendar-outline" size={screenWidth * 0.04} color="#0047AB" />
                            </View>
                            <Text style={styles.receiptBillDate}>
                              {billDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                            <View style={styles.receiptBillAmount}>
                              <Text style={styles.receiptBillAmountText}>
                                Rs.{bill.amount.toLocaleString()}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.receiptBillFooter}>
                            <Ionicons name="checkmark-circle" size={screenWidth * 0.035} color="#10b981" />
                            <Text style={styles.receiptBillPaidText}>
                              Paid on {paymentDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Total Amount Section */}
                  <View style={styles.receiptTotalSection}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.receiptTotalCard}>
                      <View style={styles.receiptTotalContent}>
                        <Ionicons name="cash" size={screenWidth * 0.06} color="#fff" />
                        <View style={styles.receiptTotalTextContainer}>
                          <Text style={styles.receiptTotalLabel}>Total Amount Paid</Text>
                          <Text style={styles.receiptTotalValue}>Rs.{receiptData?.totalAmount.toLocaleString()}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Footer */}
                  <View style={styles.receiptFooter}>
                    <View style={styles.receiptFooterDivider} />
                    <View style={styles.receiptFooterContent}>
                      <View style={styles.receiptFooterRow}>
                        <Ionicons name="person-outline" size={screenWidth * 0.04} color="#64748b" />
                        <Text style={styles.receiptFooterLabel}>Generated by:</Text>
                        <Text style={styles.receiptFooterValue}>{receiptData?.staffName}</Text>
                      </View>
                      <View style={styles.receiptFooterRow}>
                        <Ionicons name="time-outline" size={screenWidth * 0.04} color="#64748b" />
                        <Text style={styles.receiptFooterLabel}>Date:</Text>
                        <Text style={styles.receiptFooterValue}>
                          {receiptData?.currentDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptThankYouSection}>
                      <Ionicons name="heart" size={screenWidth * 0.05} color="#0047AB" />
                      <Text style={styles.receiptThankYou}>Thank you for your payment!</Text>
                      <Text style={styles.receiptSlogan}>Water Supply - Your Trusted Partner</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ViewShot>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (screenWidth, screenHeight) => StyleSheet.create({
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.95,
    maxHeight: screenHeight * 0.9,
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.05,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    flex: 1,
  },
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: screenWidth * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: screenWidth * 0.02,
  },
  modalTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  shareButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: screenWidth * 0.02,
  },
  shareButtonHeaderText: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    color: '#0047AB',
    marginLeft: screenWidth * 0.01,
  },
  receiptScrollView: {
    flex: 1,
  },
  receiptContainer: {
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.05,
    overflow: 'hidden',
  },
  receiptHeader: {
    padding: screenWidth * 0.06,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  receiptHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptLogoContainer: {
    marginRight: screenWidth * 0.04,
    padding: screenWidth * 0.02,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: screenWidth * 0.03,
  },
  receiptTitleContainer: {
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: screenHeight * 0.005,
  },
  receiptSubtitle: {
    fontSize: screenWidth * 0.035,
    color: '#e0f2fe',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: screenHeight * 0.005,
  },
  receiptTagline: {
    fontSize: screenWidth * 0.03,
    color: '#e0f2fe',
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  receiptBody: {
    padding: screenWidth * 0.06,
  },
  receiptSection: {
    // marginBottom: screenHeight * 0.02,
  },
  receiptSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.015,
  },
  receiptSectionHeaderText: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#0047AB',
    marginLeft: screenWidth * 0.02,
  },
  receiptInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.04,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptInfoRow: {
    flexDirection: 'row',
    flexWrap:'nowrap',
    alignItems: 'center',
    marginBottom: screenHeight * 0.01,
  },
  receiptInfoLabel: {
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    color: '#64748b',
    width: screenWidth * 0.25,
  },
  receiptInfoValue: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: screenHeight * 0.02,
  },
  receiptBillCard: {
    backgroundColor: '#fefefe',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.01,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  receiptBillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.01,
  },
  receiptBillIcon: {
    marginRight: screenWidth * 0.03,
  },
  receiptBillDate: {
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  receiptBillAmount: {
    backgroundColor: '#10b981',
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.005,
    borderRadius: screenWidth * 0.02,
  },
  receiptBillAmountText: {
    fontSize: screenWidth * 0.035,
    fontWeight: 'bold',
    color: '#fff',
  },
  receiptBillFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptBillPaidText: {
    fontSize: screenWidth * 0.035,
    color: '#10b981',
    marginLeft: screenWidth * 0.02,
    fontWeight: '500',
  },
  receiptTotalSection: {
    // marginVertical: screenHeight * 0.02,
  },
  receiptTotalCard: {
    borderRadius: screenWidth * 0.04,
    padding: screenWidth * 0.05,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  receiptTotalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTotalTextContainer: {
    marginLeft: screenWidth * 0.04,
  },
  receiptTotalLabel: {
    fontSize: screenWidth * 0.04,
    color: '#fff',
    fontWeight: '600',
  },
  receiptTotalValue: {
    fontSize: screenWidth * 0.055,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: screenHeight * 0.005,
  },
  receiptFooter: {
    marginTop: screenHeight * 0.02,
    paddingTop: screenHeight * 0.02,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  receiptFooterDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '100%',
    marginBottom: screenHeight * 0.02,
  },
  receiptFooterContent: {
    width: '100%',
  },
  receiptFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.01,
  },
  receiptFooterLabel: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
    width: screenWidth * 0.25,
  },
  receiptFooterValue: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  receiptThankYouSection: {
    marginTop: screenHeight * 0.02,
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: screenWidth * 0.04,
    borderRadius: screenWidth * 0.03,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  receiptThankYou: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#0047AB',
    marginTop: screenHeight * 0.01,
    textAlign: 'center',
  },
  receiptSlogan: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
    marginTop: screenHeight * 0.005,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: screenWidth * 0.06,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.015,
    borderRadius: screenWidth * 0.03,
    marginHorizontal: screenWidth * 0.02,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    color: '#64748b',
  },
  shareButton: {
    backgroundColor: '#0047AB',
  },
  shareButtonText: {
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    color: '#fff',
    marginLeft: screenWidth * 0.02,
  },
});
