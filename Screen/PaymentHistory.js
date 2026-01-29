import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PaymentHistory({ navigation, route }) {
  const { customerId, customerName } = route.params;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const billsQuery = query(
      collection(db, "bills"),
      where("customerId", "==", customerId)
    );

    const unsubscribe = onSnapshot(billsQuery, (snapshot) => {
      const billsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort bills by billDate descending (newest first)
      billsData.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
      setBills(billsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [customerId]);

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

  const formatBillDate = (billDate) => {
    if (!billDate) return 'N/A';

    try {
      let date;
      if (billDate.toDate) {
        // Firestore Timestamp
        date = billDate.toDate();
      } else if (typeof billDate === 'string' || typeof billDate === 'number') {
        // String or number timestamp
        date = new Date(billDate);
      } else {
        // Already a Date object
        date = new Date(billDate);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting bill date:', error);
      return 'Invalid Date';
    }
  };

  const handleStatusChange = async (billId, currentStatus) => {
    let newStatus;
    if (currentStatus === 'paid') {
      newStatus = 'not paid';
    } else if (currentStatus === 'not paid') {
      newStatus = 'pending';
    } else {
      newStatus = 'paid';
    }

    try {
      const billRef = doc(db, "bills", billId);
      const updateData = {
        status: newStatus,
        paymentDate: newStatus === 'paid' ? new Date() : null
      };
      await updateDoc(billRef, updateData);
      Alert.alert('Success', `Bill status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating bill status:', error);
      Alert.alert('Error', 'Failed to update bill status');
    }
  };

  const renderBill = ({ item }) => (
    <View style={styles.billItem}>
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={styles.billAmount}>Rs.{item.amount.toLocaleString()}</Text>
          <Text style={styles.billDate}>
            Bill Date: {formatBillDate(item.billDate)}
          </Text>
          {item.paymentDate && (
            <Text style={styles.paymentDate}>
              Paid on: {formatBillDate(item.paymentDate)}
            </Text>
          )}
        </View>
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {item.notes && (
        <Text style={styles.notes}>Notes: {item.notes}</Text>
      )}

      <TouchableOpacity
        style={styles.statusButton}
        onPress={() => handleStatusChange(item.id, item.status)}
      >
        <Text style={styles.statusButtonText}>
          Mark as {item.status === 'paid' ? 'Unpaid' : item.status === 'not paid' ? 'Pending' : 'Paid'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0047AB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={['#0047AB', '#0284c7']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>💳 Payment History</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        data={bills}
        keyExtractor={item => item.id}
        renderItem={renderBill}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No bills found for this customer</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: screenWidth * 0.04,
  },
  headerTitle: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: screenHeight * 0.005,
  },
  customerName: {
    fontSize: screenWidth * 0.035,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listContainer: {
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: screenHeight * 0.05,
  },
  billItem: {
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.015,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.01,
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: screenHeight * 0.005,
  },
  billDate: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.02,
    paddingVertical: screenHeight * 0.005,
    borderRadius: screenWidth * 0.03,
  },
  statusText: {
    fontSize: screenWidth * 0.03,
    fontWeight: '600',
    marginLeft: screenWidth * 0.01,
  },
  paymentDate: {
    fontSize: screenWidth * 0.035,
    color: '#10b981',
    marginBottom: screenHeight * 0.005,
  },
  notes: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
    fontStyle: 'italic',
  },
  statusButton: {
    marginTop: screenHeight * 0.01,
    backgroundColor: '#0047AB',
    paddingVertical: screenHeight * 0.0075,
    paddingHorizontal: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
    alignSelf: 'flex-start',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.03,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.15,
  },
  emptyText: {
    fontSize: screenWidth * 0.04,
    color: '#64748b',
    marginTop: screenHeight * 0.02,
    textAlign: 'center',
  },
});
