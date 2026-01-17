import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function PendingBills({ navigation }) {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fixedPrice, setFixedPrice] = useState(1000);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    // Fetch customers data
    const customersCollection = collection(db, "customers");
    const customersUnsubscribe = onSnapshot(customersCollection, (snapshot) => {
      const customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customersData);
    });

    // Fetch bills data
    const billsCollection = collection(db, "bills");
    const billsUnsubscribe = onSnapshot(billsCollection, (snapshot) => {
      const billsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBills(billsData);
      setLoading(false);
    });

    return () => {
      customersUnsubscribe();
      billsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    const settingsCollection = collection(db, "settings");
    const unsubscribe = onSnapshot(settingsCollection, (snapshot) => {
      if (!snapshot.empty) {
        const settingsData = snapshot.docs[0].data();
        setFixedPrice(settingsData.fixedPrice || 1000);
      } else {
        setFixedPrice(1000);
      }
    });

    return () => unsubscribe();
  }, []);

  // Combine bills with customer data and filter for pending bills
  const pendingBillsWithCustomers = bills
    .filter(bill => bill.status === 'pending' || bill.status === 'not paid')
    .map(bill => {
      const customer = customers.find(c => c.id === bill.customerId);
      return {
        ...bill,
        customer: customer || { name: 'Unknown Customer', connectionNo: 'N/A' }
      };
    })
    .filter(bill => bill.customer); // Only show bills with valid customers

  // Filter based on search query
  const filteredBills = pendingBillsWithCustomers.filter(bill => {
    const searchTerm = searchQuery ? searchQuery.toLowerCase() : '';
    const customer = bill.customer;
    return searchTerm === '' ||
      (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
      (customer.cnic && customer.cnic.toLowerCase().includes(searchTerm)) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm)) ||
      (customer.connectionNo && customer.connectionNo.toLowerCase().includes(searchTerm));
  });

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

  const handleViewHistory = (customerId, customerName) => {
    navigation.navigate('PaymentHistory', { customerId, customerName });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'not paid': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderBill = ({ item }) => (
    <View style={styles.customerItem}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.customer.name}</Text>
        <Text style={styles.customerDetails}>CNIC: {item.customer.cnic || 'N/A'}</Text>
        <Text style={styles.customerDetails}>Phone: {item.customer.phone || 'N/A'}</Text>
        <Text style={styles.customerDetails}>Connection No: {item.customer.connectionNo}</Text>
        <Text style={styles.billDate}>
          Bill Date: {new Date(item.billDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      </View>
      <View style={styles.billInfo}>
        <Text style={[styles.pendingAmount, { color: getStatusColor(item.status) }]}>
          Rs.{item.amount.toLocaleString()}
        </Text>
        <Text style={[styles.pendingLabel, { color: getStatusColor(item.status) }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => handleViewHistory(item.customerId, item.customer.name)}
        >
          <Text style={styles.historyButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Bills</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editButton}>
          <Ionicons name="pencil" size={24} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, CNIC, phone, or connection no..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748b"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={item => item.id}
        renderItem={renderBill}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No bills match your search' : 'No pending bills found'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  searchContainer: {
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
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
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 5,
  },
  listContainer: {
    padding: 20,
  },
  customerItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  billInfo: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 2,
  },
  pendingLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  historyButton: {
    marginTop: 8,
    backgroundColor: '#0ea5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12,
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
    maxHeight: '60%',
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
  modalBody: {
    padding: 20,
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
    backgroundColor: '#0ea5e9',
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
});
