import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, TextInput, Modal, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PendingBills({ navigation }) {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fixedPrice, setFixedPrice] = useState(1000);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (!navigation) {
      // Clear all data when user logs out
      setCustomers([]);
      setBills([]);
      setLoading(false);
      return;
    }

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
  }, [navigation]);

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
        customer: customer || { name: 'Unknown Customer', connection: 'N/A' }
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
      (customer.connection && customer.connection.toLowerCase().includes(searchTerm));
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

  const renderBill = ({ item }) => (
    <View style={styles.customerItem}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.customer.name}</Text>
        <Text style={styles.customerDetails}>CNIC: {item.customer.cnic || 'N/A'}</Text>
        <Text style={styles.customerDetails}>Phone: {item.customer.phone || 'N/A'}</Text>
        <Text style={styles.customerDetails}>Connection No: {item.customer.connection}</Text>
        <Text style={styles.billDate}>
          Bill Date: {formatBillDate(item.billDate)}
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
            <Text style={styles.headerTitle}>📄 Pending Bills</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editButton}>
              <Ionicons name="pencil" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
  headerTitle: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: screenHeight * 0.005,
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    marginBottom: screenHeight * 0.02,
    paddingHorizontal: screenWidth * 0.05,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: screenWidth * 0.025,
  },
  searchInput: {
    flex: 1,
    fontSize: screenWidth * 0.04,
    color: '#1e293b',
  },
  clearButton: {
    padding: 5,
  },
  listContainer: {
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: screenHeight * 0.05,
  },
  customerItem: {
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.015,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: screenHeight * 0.005,
  },
  customerDetails: {
    fontSize: screenWidth * 0.035,
    color: '#64748b',
    marginBottom: screenHeight * 0.0025,
  },
  billInfo: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: screenHeight * 0.0025,
  },
  pendingLabel: {
    fontSize: screenWidth * 0.03,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billDate: {
    fontSize: screenWidth * 0.03,
    color: '#64748b',
    marginTop: screenHeight * 0.005,
  },
  historyButton: {
    marginTop: screenHeight * 0.01,
    backgroundColor: '#0047AB',
    paddingVertical: screenHeight * 0.0075,
    paddingHorizontal: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
  },
  historyButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.05,
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
    padding: screenWidth * 0.05,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: screenWidth * 0.05,
  },
  modalLabel: {
    fontSize: screenWidth * 0.04,
    color: '#64748b',
    marginBottom: screenHeight * 0.02,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: screenWidth * 0.02,
    padding: screenWidth * 0.03,
    fontSize: screenWidth * 0.04,
    marginBottom: screenHeight * 0.025,
    color: '#1e293b',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.04,
    borderRadius: screenWidth * 0.02,
    alignItems: 'center',
    marginHorizontal: screenWidth * 0.0125,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#0047AB',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
});
