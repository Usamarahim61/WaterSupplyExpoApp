import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Animated, Dimensions, FlatList, Modal, ScrollView as RNScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const { logout } = useAuth();

  // State for staff and customers data
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaffCustomers, setSelectedStaffCustomers] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Wave animations
    const animateWaves = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateWaves();

    // Fetch staff and customers data
    const fetchData = async () => {
      try {
        const staffCollection = collection(db, "staff");
        const staffUnsubscribe = onSnapshot(staffCollection, (snapshot) => {
          const staffData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setStaff(staffData);
        });

        const customersCollection = collection(db, "customers");
        const customersUnsubscribe = onSnapshot(customersCollection, (snapshot) => {
          const customersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCustomers(customersData);
        });

        return () => {
          staffUnsubscribe();
          customersUnsubscribe();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Process staff assignments when staff or customers change
  useEffect(() => {
    const assignments = staff.map((staffMember) => {
      const assignedCustomers = customers.filter(
        (customer) => customer.assignedTo === staffMember.id
      );
      return {
        ...staffMember,
        customerCount: assignedCustomers.length,
        customers: assignedCustomers,
      };
    });
    setStaffAssignments(assignments);
  }, [staff, customers]);

  const handleNavigation = (navigate) => {
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

  const StatCard = ({ title, value, icon, gradient, onPress, delay = 0 }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }, []);

    return (
      <Animated.View
        style={{
          transform: [{ scale: cardAnim }],
          opacity: cardAnim,
        }}
      >
        <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
          <LinearGradient colors={gradient} style={styles.statCardGradient}>
            <View style={styles.flexRow}>
            <View style={styles.statIconContainer}>
              <Ionicons name={icon} size={32} color="#fff" />
            </View>
            <Text style={styles.statValue}>{value}</Text>
</View>          
<Text style={styles.statTitle}>{title}</Text>
          </LinearGradient>            

        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ActionCard = ({ icon, title, subtitle, onPress, color = '#0ea5e9', delay = 0 }) => {
    const actionAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.spring(actionAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }, []);

    return (
      <Animated.View
        style={{
          transform: [{ scale: actionAnim }],
          opacity: actionAnim,
        }}
      >
        <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const StaffAssignmentCard = ({ item, delay = 0 }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }, []);

    const handlePress = () => {
      setSelectedStaffName(item.name);
      setSelectedStaffCustomers(item.customers);
      setModalVisible(true);
    };

    return (
      <Animated.View
        style={{
          transform: [{ scale: cardAnim }],
          opacity: cardAnim,
        }}
      >
        <TouchableOpacity
          style={styles.assignmentCard}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#fff', '#f8fafc']} style={styles.assignmentCardGradient}>
            <View style={styles.assignmentHeader}>
              <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.staffAvatar}>
                <Text style={styles.staffAvatarText}>{item.name.charAt(0)}</Text>
              </LinearGradient>
              <View style={styles.assignmentInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.customerCount}>{item.customerCount} customers assigned</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#64748b" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Waves */}
      <Animated.View
        style={[
          styles.wave1,
          {
            transform: [
              {
                translateX: waveAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width, width],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={['rgba(14, 165, 233, 0.1)', 'rgba(56, 189, 248, 0.05)']} style={styles.waveShape} />
      </Animated.View>

      <Animated.View
        style={[
          styles.wave2,
          {
            transform: [
              {
                translateX: waveAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, -width],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={['rgba(6, 182, 212, 0.08)', 'rgba(14, 165, 233, 0.03)']} style={styles.waveShape} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>🌊 WaterFlow Admin</Text>
                <Text style={styles.headerSubtitle}>Smart Water Supply Management</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: scaleAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📊 Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Customers"
              value="1,240"
              icon="people"
              gradient={['#0ea5e9', '#0284c7']}
              onPress={() => handleNavigation('ManageCustomers')}
              delay={200}
            />
            <StatCard
              title="Active Staff"
              value="12"
              icon="person"
              gradient={['#06b6d4', '#0891b2']}
              onPress={() => handleNavigation('ManageStaff')}
              delay={400}
            />
            <StatCard
              title="Pending Bills"
              value="45"
              icon="document-text"
              gradient={['#f59e0b', '#d97706']}
              onPress={() => navigation.navigate('ManageCustomers')}
              delay={600}
            />
            <StatCard
              title="Revenue"
              value="$4,200"
              icon="cash"
              gradient={['#10b981', '#059669']}
              onPress={() => navigation.navigate('ManageCustomers')}
              delay={800}
            />
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <ActionCard
              icon="person-add"
              title="Add Customer"
              subtitle="Register new customer"
              color="#0ea5e9"
              delay={300}
            />
            <ActionCard
              icon="people"
              title="Manage Staff"
              subtitle="Add, edit, and manage staff"
              onPress={() => handleNavigation('ManageStaff')}
              color="#06b6d4"
              delay={400}
            />
            <ActionCard
              icon="receipt"
              title="Generate Bills"
              subtitle="Create monthly invoices"
              color="#10b981"
              delay={600}
            />
            <ActionCard
              icon="list"
              title="Assign Tasks"
              subtitle="Manage staff assignments"
              onPress={() => handleNavigation('AssignCustomers')}
              color="#f59e0b"
              delay={700}
            />
            <ActionCard
              icon="analytics"
              title="Reports"
              subtitle="View detailed analytics"
              color="#ef4444"
              delay={900}
            />
          </View>
        </Animated.View>

        {/* Staff Assignments */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>👥 Staff Assignments</Text>
          <View style={styles.assignmentsContainer}>
            {staffAssignments.length > 0 ? (
              staffAssignments.map((item, index) => (
                <StaffAssignmentCard key={item.id} item={item} delay={index * 100} />
              ))
            ) : (
              <View style={styles.noAssignments}>
                <Ionicons name="people" size={48} color="#cbd5e1" />
                <Text style={styles.noAssignmentsText}>No staff assignments yet</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📋 Recent Activity</Text>
          <View style={styles.activityContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="person-add" size={20} color="#10b981" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New customer registered</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="receipt" size={20} color="#0ea5e9" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Monthly bills generated</Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Payment received</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal for Assigned Customers */}
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
                {selectedStaffName}'s Assigned Customers
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <RNScrollView style={styles.modalBody}>
              {selectedStaffCustomers && selectedStaffCustomers.length > 0 ? (
                selectedStaffCustomers.map((customer) => (
                  <View key={customer.id} style={styles.customerItem}>
                    <Ionicons name="person" size={16} color="#0ea5e9" />
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerId}>ID: {customer.connectionNo}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noCustomers}>No customers assigned</Text>
              )}
            </RNScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  wave1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
  },
  wave2: {
    position: 'absolute',
    top: height * 0.1,
    left: 0,
    right: 0,
    height: height * 0.25,
  },
  waveShape: {
    flex: 1,
    borderBottomLeftRadius: width * 0.5,
    borderBottomRightRadius: width * 0.5,
  },
  header: {
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    maxWidth: '95%',
    minWidth: '50%',
    marginBottom: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statCardGradient: {
    padding: 20,
    borderRadius: 16,

    // alignItems: 'center',
  },
  flexRow:{
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:"space-between"

  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    // marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#e0f2fe',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statArrow: {
    opacity: 0.8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  activityContainer: {
    gap: 12,
  },
  activityItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b',
  },
  assignmentsContainer: {
    gap: 12,
  },
  assignmentCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  assignmentCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  staffAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  assignmentInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerCount: {
    fontSize: 14,
    color: '#64748b',
  },
  customerList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  customerId: {
    fontSize: 12,
    color: '#64748b',
  },
  noCustomers: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  noAssignments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noAssignmentsText: {
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
    padding: 8,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
});
