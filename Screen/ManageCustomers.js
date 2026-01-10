import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Modal, ScrollView, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ManageCustomers({ navigation }) {
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Form State
  const [customerData, setCustomerData] = useState({
    name: '',
    cnic: '',
    phone: '',
    address: '',
    connectionNo: '',
  });

  // Sample Data
  const [customers, setCustomers] = useState([
    { id: '1', name: 'John Doe', connection: 'W-9921', phone: '0300-1234567', cnic: '42101-1111111-1', address: 'House 1, Street 2', status: 'Active' },
    { id: '2', name: 'Sajid Khan', connection: 'W-9922', phone: '0312-7654321', cnic: '42101-2222222-2', address: 'Flat 402, Building B', status: 'Pending' },
  ]);

  // Open Modal for New Entry
  const openAddModal = () => {
    setIsEditing(false);
    setCustomerData({ name: '', cnic: '', phone: '', address: '', connectionNo: '' });
    setModalVisible(true);
  };

  // Open Modal for Editing
  const openEditModal = (item) => {
    setIsEditing(true);
    setSelectedCustomerId(item.id);
    setCustomerData({
      name: item.name,
      cnic: item.cnic,
      phone: item.phone,
      address: item.address,
      connectionNo: item.connection,
    });
    setModalVisible(true);
  };

  // Handle Save (Both Create and Update)
  const handleSaveCustomer = () => {
    if (!customerData.name || !customerData.connectionNo) {
      Alert.alert("Error", "Please fill in Name and Connection Number");
      return;
    }

    if (isEditing) {
      // Update existing
      setCustomers(customers.map(c => 
        c.id === selectedCustomerId 
        ? { ...c, ...customerData, connection: customerData.connectionNo } 
        : c
      ));
    } else {
      // Add new
      const newCustomer = {
        id: Math.random().toString(),
        ...customerData,
        connection: customerData.connectionNo,
        status: 'Active',
      };
      setCustomers([newCustomer, ...customers]);
    }

    setModalVisible(false);
    setCustomerData({ name: '', cnic: '', phone: '', address: '', connectionNo: '' });
  };

  // Handle Delete
  const handleDelete = (id) => {
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to remove this customer record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => setCustomers(customers.filter(c => c.id !== id)) 
        }
      ]
    );
  };

  // Filter List based on Search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.connection.toLowerCase().includes(search.toLowerCase())
  );

  const renderCustomer = ({ item }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerSub}>ID: {item.connection} | {item.phone}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.iconBtn} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={22} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconBtn} 
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="person-add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={{ marginLeft: 15 }} />
        <TextInput 
          placeholder="Search by Name or Connection ID" 
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>}
      />

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Customer" : "Register New Customer"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Enter Name"
                value={customerData.name}
                onChangeText={(val) => setCustomerData({...customerData, name: val})}
              />

              <Text style={styles.inputLabel}>CNIC Number</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="42101-XXXXXXX-X"
                keyboardType="numeric"
                value={customerData.cnic}
                onChangeText={(val) => setCustomerData({...customerData, cnic: val})}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="03XX-XXXXXXX"
                keyboardType="phone-pad"
                value={customerData.phone}
                onChangeText={(val) => setCustomerData({...customerData, phone: val})}
              />

              <Text style={styles.inputLabel}>Connection Number</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="e.g. W-5542"
                value={customerData.connectionNo}
                onChangeText={(val) => setCustomerData({...customerData, connectionNo: val})}
              />

              <Text style={styles.inputLabel}>Home Address</Text>
              <TextInput 
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="Enter full address"
                multiline
                value={customerData.address}
                onChangeText={(val) => setCustomerData({...customerData, address: val})}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCustomer}>
                <Text style={styles.submitBtnText}>
                  {isEditing ? "Update Details" : "Register Customer"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  addBtn: { backgroundColor: '#0047AB', padding: 10, borderRadius: 12 },
  
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    margin: 20, 
    borderRadius: 15, 
    height: 55, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 16 },

  customerCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 18, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#E3F2FD', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  avatarText: { color: '#3498db', fontWeight: 'bold', fontSize: 20 },
  customerName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  customerSub: { fontSize: 13, color: '#888', marginTop: 3 },
  actionButtons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 10, padding: 8, backgroundColor: '#F8F9FD', borderRadius: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 15 },
  modalInput: { backgroundColor: '#F4F7FF', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E0E7FF' },
  submitBtn: { backgroundColor: '#0047AB', borderRadius: 15, padding: 18, alignItems: 'center', marginTop: 35, marginBottom: 15, elevation: 4 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});