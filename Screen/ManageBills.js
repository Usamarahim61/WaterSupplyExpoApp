import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, onSnapshot, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width: screenWidth, height: screenHeight } = require('react-native').Dimensions.get('window');

export default function ManageBills({ navigation }) {
  const [allBills, setAllBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'paid'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState('current'); // 'current', 'custom'

  useEffect(() => {
    const unsubscribes = [];

    // Fetch all bills
    const billsUnsubscribe = onSnapshot(collection(db, "bills"), (snapshot) => {
      const allBillsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAllBills(allBillsData);
      setLoading(false);
    });
    unsubscribes.push(billsUnsubscribe);

    // Fetch customers for bill details
    const customersUnsubscribe = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customersData);
    });
    unsubscribes.push(customersUnsubscribe);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getCustomerConnection = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.connection : 'N/A';
  };

  const handleDeleteBill = async (billId, customerName) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete the bill for ${customerName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "bills", billId));
              Alert.alert('Success', 'Bill deleted successfully!');
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('Error', 'Failed to delete bill. Please try again.');
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

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      setDateFilterMode('custom');
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      setDateFilterMode('custom');
    }
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setDateFilterMode('current');
  };

  const getBills = () => {
    if (dateFilterMode === 'current') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      return allBills.filter(bill => {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
      });
    } else {
      return allBills.filter(bill => {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        const billDateOnly = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate());

        let includeBill = true;
        if (startDate) {
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          includeBill = includeBill && billDateOnly >= startDateOnly;
        }
        if (endDate) {
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          includeBill = includeBill && billDateOnly <= endDateOnly;
        }
        return includeBill;
      });
    }
  };

  const getFilteredBills = () => {
    let filtered = getBills();

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(bill => {
        const customerName = getCustomerName(bill.customerId).toLowerCase();
        const connectionNo = getCustomerConnection(bill.customerId).toLowerCase();
        return customerName.includes(searchLower) || connectionNo.includes(searchLower);
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(bill => bill.status === filterStatus);
    }

    return filtered;
  };

  const filteredBills = getFilteredBills();

  const getTotalAmount = () => {
    return filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>📄 Manage Bills</Text>
                <Text style={styles.headerSubtitle}>
                  {dateFilterMode === 'current' ? 'Current Month Bills' : 'Custom Date Range'}
                </Text>
              </View>
              <View style={{ width: 24 }} />
            </View>
          </LinearGradient>
        </View>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 {dateFilterMode === 'current' ? 'Current Month' : 'Filtered Date Range'} Summary
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.statCardGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="document-text" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>{filteredBills.length}</Text>
                <Text style={styles.statTitle}>Total Bills</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.statCardGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cash" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>Rs.{getTotalAmount().toLocaleString()}</Text>
                <Text style={styles.statTitle}>Total Amount</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Search & Filter</Text>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by customer name or connection no..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#94a3b8"
              />
              {searchText !== '' && (
                <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Date Filter */}
          <View style={styles.dateFilterContainer}>
            <Text style={styles.dateFilterLabel}>Date Range:</Text>
            <View style={styles.dateInputsContainer}>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={styles.dateInputText}>
                  {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={styles.dateInputText}>
                  {endDate ? endDate.toLocaleDateString() : 'End Date'}
                </Text>
              </TouchableOpacity>
              {(startDate || endDate) && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={clearDateFilter}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
                All ({getBills().length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('pending')}
            >
              <Text style={[styles.filterButtonText, filterStatus === 'pending' && styles.filterButtonTextActive]}>
                Pending ({getBills().filter(b => b.status === 'pending').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'paid' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('paid')}
            >
              <Text style={[styles.filterButtonText, filterStatus === 'paid' && styles.filterButtonTextActive]}>
                Paid ({getBills().filter(b => b.status === 'paid').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bills List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 {dateFilterMode === 'current' ? 'Current Month Bills' : 'Filtered Bills'}
          </Text>
          <View style={styles.billsContainer}>
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <View key={bill.id} style={styles.billCard}>
                  <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.billCardGradient}>
                    <View style={styles.billHeader}>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{getCustomerName(bill.customerId)}</Text>
                        <Text style={styles.customerSub}>ID: {getCustomerConnection(bill.customerId)}</Text>
                        <Text style={styles.billDate}>
                          {new Date(bill.billDate?.toDate ? bill.billDate.toDate() : bill.billDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      <View style={styles.billActions}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                            {bill.status?.toUpperCase() || 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.billDetails}>
                      <View style={styles.amountContainer}>
                        <Text style={styles.amountLabel}>Amount:</Text>
                        <Text style={styles.amountValue}>Rs.{bill.amount.toLocaleString()}</Text>
                      </View>
                      {bill.notes && (
                        <Text style={styles.billNotes}>{bill.notes}</Text>
                      )}
                    </View>

                    <View style={styles.billFooter}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBill(bill.id, getCustomerName(bill.customerId))}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text style={styles.deleteButtonText}>Delete Bill</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ))
            ) : (
              <View style={styles.noBills}>
                <Ionicons name="document-text" size={48} color="#cbd5e1" />
                <Text style={styles.noBillsText}>
                  {getBills().length > 0 ? 'No bills match your search' : 'No bills generated for selected period'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={onStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={onEndDateChange}
        />
      )}
    </SafeAreaView>
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
    marginTop: 15,
    fontSize: 16,
    color: '#64748b',
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
  section: {
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.03,
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
    justifyContent: 'space-between',
  },
  statCard: {
    width: (screenWidth - screenWidth * 0.1 - 20) / 2,
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
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: screenWidth * 0.035,
    color: '#e0f2fe',
    opacity: 0.9,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  clearButton: {
    padding: 5,
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
  billsContainer: {
    gap: 12,
  },
  billCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  billCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  billDate: {
    fontSize: 12,
    color: '#64748b',
  },
  billActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billDetails: {
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  billNotes: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  billFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noBills: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noBillsText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  dateFilterContainer: {
    marginBottom: 16,
  },
  dateFilterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateInputText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  clearDateButton: {
    padding: 8,
  },
});
