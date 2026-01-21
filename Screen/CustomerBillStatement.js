import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function CustomerBillStatement({ navigation, route }) {
  const { customer } = route.params;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch bills for this customer
    const billsQuery = query(
      collection(db, "bills"),
      where("customerId", "==", customer.id)
    );

    const unsubscribe = onSnapshot(billsQuery, (snapshot) => {
      const billsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort bills by bill date (newest first)
      billsData.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));

      setBills(billsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [customer.id]);

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

  const BillItem = ({ item }) => {
    // Handle Firestore timestamps properly
    const billDate = item.billDate?.toDate ? item.billDate.toDate() : new Date(item.billDate);
    const paymentDate = item.paymentDate?.toDate ? item.paymentDate.toDate() : (item.paymentDate ? new Date(item.paymentDate) : null);

    // Use payment date if bill is paid, otherwise use bill date
    const displayDate = item.status === 'paid' && paymentDate ? paymentDate : billDate;

    return (
      <View style={styles.billItem}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.billItemGradient}
        >
          <View style={styles.billHeader}>
            <View style={styles.monthContainer}>
              <Text style={styles.monthText}>
                {displayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.billDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bill Date:</Text>
              <Text style={styles.detailValue}>
                {billDate.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>Rs.{item.amount.toLocaleString()}</Text>
            </View>

            {item.status === 'paid' && paymentDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Date:</Text>
                <Text style={styles.detailValue}>
                  {paymentDate.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}

            {item.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes:</Text>
                <Text style={styles.detailValue}>{item.notes}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const totalPaid = bills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const totalPending = bills.filter(bill => bill.status === 'pending' || bill.status === 'not paid').reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bill Statement</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerId}>ID: {customer.connection}</Text>
        </View>
      </LinearGradient>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.summaryGradient}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.summaryValue}>Rs.{totalPaid.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Paid</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryItem}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.summaryGradient}>
            <Ionicons name="time" size={24} color="#fff" />
            <Text style={styles.summaryValue}>Rs.{totalPending.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Bills List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading bill statement...</Text>
        </View>
      ) : bills.length > 0 ? (
        <FlatList
          data={bills}
          renderItem={({ item }) => <BillItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Bills Found</Text>
          <Text style={styles.emptySubtitle}>
            This customer doesn't have any bills yet
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  customerId: {
    fontSize: 14,
    color: '#e0f2fe',
    opacity: 0.9,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
  summaryItem: {
    width: '48%',
  },
  summaryGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#e0f2fe',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  billItem: {
    marginBottom: 16,
  },
  billItemGradient: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthContainer: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  monthText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  billDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
