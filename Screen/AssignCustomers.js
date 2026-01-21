import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Modal, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AssignCustomers({ navigation, route }) {
  const [staffMembers, setStaffMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedCustomers, setAssignedCustomers] = useState([]);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'assigned', 'unassigned'

  useEffect(() => {
    // Fetch staff and customers from Firebase
    const fetchData = async () => {
      try {
        // Fetch staff
        const staffCollection = collection(db, "staff");
        const staffUnsubscribe = onSnapshot(staffCollection, (snapshot) => {
          const staffData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setStaffMembers(staffData);

          // Check if staff was passed from navigation
          if (route.params?.selectedStaff) {
            const preSelectedStaff = staffData.find(staff => staff.id === route.params.selectedStaff.id);
            if (preSelectedStaff) {
              setSelectedStaff(preSelectedStaff);
            }
          }
        });

        // Fetch customers
        const customersCollection = collection(db, "customers");
        const customersUnsubscribe = onSnapshot(customersCollection, (snapshot) => {
          const customersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCustomers(customersData);
          setLoading(false);
        });

        // Cleanup function to unsubscribe from listeners
        return () => {
          staffUnsubscribe();
          customersUnsubscribe();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load data");
        setLoading(false);
      }
    };

    fetchData();
  }, [route.params]);

  // Show modal when staff is pre-selected and customers are loaded
  useEffect(() => {
    if (selectedStaff && customers.length > 0 && route.params?.selectedStaff) {
      const assigned = customers.filter(customer => customer.assignedTo === selectedStaff.uid);
      setAssignedCustomers(assigned);
      setModalVisible(true);
    }
  }, [selectedStaff, customers, route.params]);

  // Filter and search customers
  const filteredCustomers = customers.filter(customer => {
    const searchTerm = searchQuery ? searchQuery.toLowerCase() : '';

    const matchesSearch = searchTerm === '' ||
      (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
      (customer.connectionNo && customer.connectionNo.toLowerCase().includes(searchTerm)) ||
      (customer.cnic && customer.cnic.toLowerCase().includes(searchTerm)) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm));

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'assigned' && customer.assignedTo) ||
      (filterStatus === 'unassigned' && !customer.assignedTo);

    return matchesSearch && matchesFilter;
  });

  // Toggle customer selection
  const toggleCustomerSelection = (id) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(item => item !== id));
    } else {
      setSelectedCustomers([...selectedCustomers, id]);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff) return Alert.alert("Selection Required", "Please select a staff member first.");
    if (selectedCustomers.length === 0) return Alert.alert("Selection Required", "Please select at least one customer.");

    try {
      // Separate customers into assign and unassign operations
      const assignOperations = [];
      const unassignOperations = [];

      selectedCustomers.forEach(customerId => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          if (customer.assignedTo === selectedStaff.uid) {
            // Customer is already assigned to this staff, unassign them
            unassignOperations.push(customerId);
          } else {
            // Assign customer to this staff
            assignOperations.push(customerId);
          }
        }
      });

      // Update assigned customers
      const assignPromises = assignOperations.map(async (customerId) => {
        const customerRef = doc(db, "customers", customerId);
        await updateDoc(customerRef, {
          assignedTo: selectedStaff.uid,
        });
      });

      // Update unassigned customers
      const unassignPromises = unassignOperations.map(async (customerId) => {
        const customerRef = doc(db, "customers", customerId);
        await updateDoc(customerRef, {
          assignedTo: null,
        });
      });

      await Promise.all([...assignPromises, ...unassignPromises]);

      const assignCount = assignOperations.length;
      const unassignCount = unassignOperations.length;

      let message = "";
      if (assignCount > 0 && unassignCount > 0) {
        message = `Assigned ${assignCount} and unassigned ${unassignCount} customers for ${selectedStaff.name}`;
      } else if (assignCount > 0) {
        message = `Assigned ${assignCount} customers to ${selectedStaff.name}`;
      } else if (unassignCount > 0) {
        message = `Unassigned ${unassignCount} customers from ${selectedStaff.name}`;
      }

      Alert.alert("Success", message);
      setSelectedCustomers([]); // Clear selection after operation
    } catch (error) {
      console.error("Error updating customer assignments:", error);
      Alert.alert("Error", "Failed to update customer assignments. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Customers</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step 1: Select Staff */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Staff Member</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={staffMembers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.staffCard, selectedStaff?.id === item.id && styles.activeStaff]}
              onPress={() => setSelectedStaff(item)}
            >
              <Ionicons name="person" size={24} color={selectedStaff?.id === item.id ? "white" : "#0047AB"} />
              <Text style={[styles.staffName, selectedStaff?.id === item.id && { color: 'white' }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Step 2: Select Customers */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>2. Select Customers to Assign</Text>

        {/* Search and Filter Controls */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID, CNIC, or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#64748b"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.activeFilterText]}>All ({customers.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'unassigned' && styles.activeFilter]}
            onPress={() => setFilterStatus('unassigned')}
          >
            <Text style={[styles.filterText, filterStatus === 'unassigned' && styles.activeFilterText]}>
              Unassigned ({customers.filter(c => !c.assignedTo).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'assigned' && styles.activeFilter]}
            onPress={() => setFilterStatus('assigned')}
          >
            <Text style={[styles.filterText, filterStatus === 'assigned' && styles.activeFilterText]}>
              Assigned ({customers.filter(c => c.assignedTo).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bulk Selection Controls */}
        {filterStatus === 'unassigned' && filteredCustomers.length > 0 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => {
                const allUnassignedIds = filteredCustomers.map(c => c.id);
                setSelectedCustomers(allUnassignedIds);
              }}
            >
              <Text style={styles.bulkButtonText}>Select All Unassigned</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.clearButton]}
              onPress={() => setSelectedCustomers([])}
            >
              <Text style={styles.clearButtonText}>Clear Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedCustomers.includes(item.id);
            const isAssignedToSelectedStaff = item.assignedTo === selectedStaff?.id;
            const willAssign = selectedStaff && !isAssignedToSelectedStaff;
            const willUnassign = selectedStaff && isAssignedToSelectedStaff;

            return (
              <TouchableOpacity
                style={styles.customerRow}
                onPress={() => toggleCustomerSelection(item.id)}
              >
                <View style={styles.customerInfo}>
                  <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={24}
                    color={isSelected ? "#0047AB" : (item.assignedTo ? "#64748b" : "#0047AB")}
                  />
                  <View style={{ marginLeft: 15 }}>
                    <Text style={[styles.customerName, item.assignedTo && !isSelected && { color: '#64748b' }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.customerSub, item.assignedTo && !isSelected && { color: '#64748b' }]}>
                      ID: {item.connectionNo}
                    </Text>
                    {selectedStaff && isSelected && (
                      <Text style={[styles.actionText, willAssign ? styles.assignText : styles.unassignText]}>
                        {willAssign ? `Will assign to ${selectedStaff.name}` : `Will unassign from ${selectedStaff.name}`}
                      </Text>
                    )}
                  </View>
                </View>
                {item.assignedTo && (
                  <View style={[styles.badge, isAssignedToSelectedStaff && styles.selectedStaffBadge]}>
                    <Text style={[styles.badgeText, isAssignedToSelectedStaff && styles.selectedStaffBadgeText]}>
                      {isAssignedToSelectedStaff ? `Assigned to ${selectedStaff?.name}` : 'Assigned'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Assign Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.assignBtn} onPress={handleAssign}>
          <Text style={styles.assignBtnText}>Confirm Assignment ({selectedCustomers.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for Assigned Customers */}
      {selectedStaff && (
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
                  {selectedStaff.name}'s Assigned Customers
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {assignedCustomers && assignedCustomers.length > 0 ? (
                  assignedCustomers.map((customer) => {
                    const assignedStaff = staffMembers.find(staff => staff.id === customer.assignedTo);
                    return (
                      <View key={customer.id} style={styles.customerItem}>
                        <Ionicons name="person" size={16} color="#0ea5e9" />
                        <View style={styles.customerDetails}>
                          <Text style={styles.customerName}>{customer.name}</Text>
                          <Text style={styles.customerInfo}>CNIC: {customer.cnic || 'N/A'}</Text>
                          <Text style={styles.customerInfo}>Phone: {customer.phone || 'N/A'}</Text>
                          <Text style={styles.customerId}>ID: {customer.connectionNo}</Text>
                        </View>
                        {assignedStaff && (
                          <View style={styles.assignedBadge}>
                            <Text style={styles.assignedBadgeText}>Assigned to {assignedStaff.name}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noCustomers}>No customers assigned</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#555' },
  
  staffCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    marginRight: 10, 
    alignItems: 'center', 
    width: 110,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  activeStaff: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  staffName: { marginTop: 8, fontSize: 12, fontWeight: 'bold', color: '#333' },

  customerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10,
    elevation: 1
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center' },
  customerName: { fontWeight: 'bold', fontSize: 15 },
  customerSub: { fontSize: 12, color: '#888' },
  
  badge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { fontSize: 10, color: '#0047AB', fontWeight: 'bold' },

  footer: { padding: 20, backgroundColor: '#fff' },
  assignBtn: { backgroundColor: '#0047AB', padding: 18, borderRadius: 15, alignItems: 'center' },
  assignBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '30%',
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
    padding: 5,
  },
  modalBody: {
    padding: 20,
    maxHeight: '60%',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  customerId: {
    fontSize: 14,
    color: '#64748b',
  },
  noCustomers: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  searchContainer: {
    marginBottom: 15,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeFilter: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterText: {
    color: '#fff',
  },
  bulkActions: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  bulkButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  assignText: {
    color: '#10b981',
  },
  unassignText: {
    color: '#ef4444',
  },
  selectedStaffBadge: {
    backgroundColor: '#0ea5e9',
  },
  selectedStaffBadgeText: {
    color: '#fff',
  },
});
