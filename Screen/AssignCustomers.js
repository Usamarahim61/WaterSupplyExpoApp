import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AssignCustomers({ navigation }) {
  // Mock Data for Staff
  const staffMembers = [
    { id: 's1', name: 'Ahmed Ali', role: 'Collector' },
    { id: 's2', name: 'Zain Khan', role: 'Staff' },
    { id: 's3', name: 'Bilal Umar', role: 'Collector' },
  ];

  // Mock Data for Customers
  const [customers, setCustomers] = useState([
    { id: 'c1', name: 'John Doe', connection: 'W-9921', assignedTo: null },
    { id: 'c2', name: 'Sajid Khan', connection: 'W-9922', assignedTo: 's1' },
    { id: 'c3', name: 'Maria Abbas', connection: 'W-9925', assignedTo: null },
    { id: 'c4', name: 'Hamza Malik', connection: 'W-9930', assignedTo: null },
  ]);

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // Toggle customer selection
  const toggleCustomerSelection = (id) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(item => item !== id));
    } else {
      setSelectedCustomers([...selectedCustomers, id]);
    }
  };

  const handleAssign = () => {
    if (!selectedStaff) return Alert.alert("Selection Required", "Please select a staff member first.");
    if (selectedCustomers.length === 0) return Alert.alert("Selection Required", "Please select at least one customer.");

    // Update local state (In production, this would be an API call)
    const updatedCustomers = customers.map(cust => {
      if (selectedCustomers.includes(cust.id)) {
        return { ...cust, assignedTo: selectedStaff.id };
      }
      return cust;
    });

    setCustomers(updatedCustomers);
    Alert.alert("Success", `Assigned ${selectedCustomers.length} customers to ${selectedStaff.name}`);
    setSelectedCustomers([]); // Clear selection after assignment
  };

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
        <FlatList
          data={customers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.customerRow}
              onPress={() => toggleCustomerSelection(item.id)}
            >
              <View style={styles.customerInfo}>
                <Ionicons 
                  name={selectedCustomers.includes(item.id) ? "checkbox" : "square-outline"} 
                  size={24} 
                  color="#0047AB" 
                />
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerSub}>ID: {item.connection}</Text>
                </View>
              </View>
              {item.assignedTo && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Already Assigned</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Assign Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.assignBtn} onPress={handleAssign}>
          <Text style={styles.assignBtnText}>Confirm Assignment ({selectedCustomers.length})</Text>
        </TouchableOpacity>
      </View>
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
  assignBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});