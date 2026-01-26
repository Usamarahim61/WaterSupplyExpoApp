import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
            {new Date(item.billDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {item.paymentDate && (
        <Text style={styles.paymentDate}>
          Paid on: {new Date(item.paymentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      )}

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0047AB" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment History</Text>
          <Text style={styles.customerName}>{customerName}</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  customerName: {
    fontSize: 14,
    color: '#64748b',
  },
  listContainer: {
    padding: 20,
  },
  billItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 14,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  statusButton: {
    marginTop: 12,
    backgroundColor: '#0047AB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
});
