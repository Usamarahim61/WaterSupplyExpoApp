import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Modal, ScrollView, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ManageStaff({ navigation }) {
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedstaffId, setSelectedstaffId] = useState(null);

  // Form State
  const [staffData, setstaffData] = useState({
    name: '',
    cnic: '',
    phone: '',
    address: '',
  });

  // Sample Data
  const [staffs, setSTaffs] = useState([
    { id: '1', name: 'John Doe', phone: '0300-1234567', cnic: '42101-1111111-1', address: 'House 1, Street 2' },
    { id: '2', name: 'Sajid Khan', phone: '0312-7654321', cnic: '42101-2222222-2', address: 'Flat 402, Building B'},
  ]);

  // Open Modal for New Entry
  const openAddModal = () => {
    setIsEditing(false);
    setstaffData({ name: '', cnic: '', phone: '', address: ''});
    setModalVisible(true);
  };

  // Open Modal for Editing
  const openEditModal = (item) => {
    setIsEditing(true);
    setSelectedstaffId(item.id);
    setstaffData({
      name: item.name,
      cnic: item.cnic,
      phone: item.phone,
      address: item.address,
    });
    setModalVisible(true);
  };

  // Handle Save (Both Create and Update)
  const handleSavestaff = () => {
    if (!staffData.name) {
      Alert.alert("Error", "Please fill in Name");
      return;
    }

    if (isEditing) {
      // Update existing
      setstaffs(staffs.map(c => 
        c.id === selectedstaffId 
        ? { ...c, ...staffData } 
        : c
      ));
    } else {
      // Add new
      const newstaff = {
        id: Math.random().toString(),
        ...staffData,
      };
      setstaffs([newstaff, ...staffs]);
    }

    setModalVisible(false);
    setstaffData({ name: '', cnic: '', phone: '', address: '' });
  };

  // Handle Delete
  const handleDelete = (id) => {
    Alert.alert(
      "Delete staff",
      "Are you sure you want to remove this staff record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => setstaffs(staffs.filter(c => c.id !== id)) 
        }
      ]
    );
  };

  // Filter List based on Search
  const filteredstaffs = staffs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.connection.toLowerCase().includes(search.toLowerCase())
  );

  const renderstaff = ({ item }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.staffName}>{item.name}</Text>
          <Text style={styles.staffSub}>ID: {item.cnic}</Text>
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
        <Text style={styles.headerTitle}>Manage staffs</Text>
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
        data={filteredstaffs}
        renderItem={renderstaff}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No staffs found.</Text>}
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
                {isEditing ? "Edit staff" : "Register New staff"}
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
                value={staffData.name}
                onChangeText={(val) => setstaffData({...staffData, name: val})}
              />

              <Text style={styles.inputLabel}>CNIC Number</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="42101-XXXXXXX-X"
                keyboardType="numeric"
                value={staffData.cnic}
                onChangeText={(val) => setstaffData({...staffData, cnic: val})}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="03XX-XXXXXXX"
                keyboardType="phone-pad"
                value={staffData.phone}
                onChangeText={(val) => setstaffData({...staffData, phone: val})}
              />

              <Text style={styles.inputLabel}>Home Address</Text>
              <TextInput 
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="Enter full address"
                multiline
                value={staffData.address}
                onChangeText={(val) => setstaffData({...staffData, address: val})}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSavestaff}>
                <Text style={styles.submitBtnText}>
                  {isEditing ? "Update Details" : "Register staff"}
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

  staffCard: { 
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
  staffInfo: { flexDirection: 'row', alignItems: 'center' },
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
  staffName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  staffSub: { fontSize: 13, color: '#888', marginTop: 3 },
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