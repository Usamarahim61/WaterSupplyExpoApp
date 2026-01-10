import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { useAuth } from '../AuthContext';

const screenWidth = Dimensions.get("window").width;

export default function AdminDashboard({navigation}) {
  const { logout } = useAuth();

  // Mock Data for Monthly Collection
  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{ data: [20, 45, 28, 80, 99, 43] }]
  };

  const handleNavigation = (navigate)=>{
    navigation.navigate(navigate);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout },
      ]
    );
  };

const SummaryCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: color, borderLeftWidth: 5 }]} 
      onPress={onPress}
    >
      <View>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
      <Ionicons name={icon} size={30} color={color} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Admin Panel</Text>
          <Text style={styles.subText}>Water Supply Management</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
          <Ionicons name="person-circle" size={40} color="#0047AB" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <SummaryCard title="Customers" value="1,240" icon="people" color="#3498db" onPress={() => handleNavigation('ManageCustomers')}/>
        <SummaryCard title="Staff" value="12" icon="construct" color="#e67e22" onPress={() => handleNavigation('ManageStaffs')}/>
        <SummaryCard title="Pending Bills" value="45" icon="time" color="#e74c3c" onPress={() => navigation.navigate('ManageCustomers')}/>
        <SummaryCard title="Monthly Revenue" value="$4,200" icon="cash" color="#2ecc71" onPress={() => navigation.navigate('ManageCustomers')}/>
      </View>

      {/* Chart Section */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Collection Overview (Monthly)</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisLabel="$"
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
        />
      </View>

      {/* Quick Management Links */}
      <Text style={[styles.sectionTitle, { marginLeft: 20 }]}>Quick Management</Text>
      <View style={styles.actionGrid}>
        <ActionButton icon="add-circle" label="New Customer" color="#0047AB" />
        <ActionButton icon="receipt" label="Generate Bills" color="#0047AB" />
        <ActionButton icon="list" label="Staff Tasks" color="#0047AB" onPress={() => handleNavigation('AssignCustomers')}/>
        <ActionButton icon="bar-chart" label="Full Reports" color="#0047AB" />
      </View>
    </ScrollView>
  );
}

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <View style={[styles.actionIconBox, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(0, 71, 171, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  barPercentage: 0.6,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff',
    paddingTop: 60 
  },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subText: { color: '#888', fontSize: 14 },
  
  statsGrid: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    backgroundColor: '#fff', 
    width: '48%', 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  cardLabel: { fontSize: 12, color: '#888' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
  
  chartSection: { backgroundColor: '#fff', margin: 20, padding: 15, borderRadius: 15, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  chart: { marginVertical: 8, borderRadius: 16 },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-around', padding: 10, marginBottom: 30 },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIconBox: { padding: 15, borderRadius: 15, marginBottom: 8 },
  actionLabel: { fontSize: 11, textAlign: 'center', fontWeight: '500' }
});