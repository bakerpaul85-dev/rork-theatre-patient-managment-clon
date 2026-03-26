import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, UserCheck, Users, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useForms } from '@/contexts/FormsContext';

interface StoredUser {
  username: string;
  password: string;
  name: string;
  email: string;
}

const USERS_STORAGE_KEY = '@theatre_users';

export default function AdminScreen() {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const { forms } = useForms();

  const loadUsers = async () => {
    try {
      console.log('[Admin Tab] Loading users from storage key:', USERS_STORAGE_KEY);
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('[Admin Tab] All AsyncStorage keys:', allKeys);
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[Admin Tab] Retrieved raw JSON:', usersJson);
      
      if (usersJson) {
        const parsedUsers: StoredUser[] = JSON.parse(usersJson);
        console.log('[Admin Tab] Parsed users count:', parsedUsers.length);
        console.log('[Admin Tab] User list:', parsedUsers.map(u => u.username).join(', '));
        setUsers(parsedUsers);
      } else {
        console.log('[Admin Tab] No users found in storage');
        setUsers([]);
      }
    } catch (error) {
      console.error('[Admin Tab] Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadUsers();
  };

  const deleteUser = async (username: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${username}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedUsers = users.filter(u => u.username !== username);
              await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
              setUsers(updatedUsers);
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('[Admin] Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const dumpStorageData = async () => {
    try {
      console.log('[Admin Tab] === STORAGE DUMP START ===');
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[Admin Tab] Raw users JSON:', usersJson);
      
      if (usersJson) {
        const parsed = JSON.parse(usersJson);
        console.log('[Admin Tab] Parsed users:', JSON.stringify(parsed, null, 2));
        Alert.alert(
          'Storage Data',
          `Found ${parsed.length} users\n\nCheck console for full details`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Storage Data', 'No data found in storage');
      }
      console.log('[Admin Tab] === STORAGE DUMP END ===');
    } catch (error) {
      console.error('[Admin Tab] Dump error:', error);
      Alert.alert('Error', 'Failed to read storage data');
    }
  };

  const clearAllUsers = () => {
    Alert.alert(
      'Clear All Users',
      'Are you sure you want to delete ALL users? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(USERS_STORAGE_KEY);
              setUsers([]);
              Alert.alert('Success', 'All users deleted successfully');
            } catch (error) {
              console.error('[Admin] Error clearing users:', error);
              Alert.alert('Error', 'Failed to clear users');
            }
          },
        },
      ]
    );
  };

  const toggleUserExpanded = (username: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  const getUserForms = (username: string) => {
    return forms.filter(form => form.status === 'submitted' && form.submittedBy === username);
  };

  const renderUserItem = ({ item }: { item: StoredUser }) => {
    const isExpanded = expandedUsers.has(item.username);
    const userForms = getUserForms(item.username);
    
    return (
      <View style={styles.userCard}>
        <TouchableOpacity 
          style={styles.userMainInfo}
          onPress={() => toggleUserExpanded(item.username)}
          activeOpacity={0.7}
        >
          <View style={styles.userInfo}>
            <View style={styles.iconContainer}>
              <UserCheck size={24} color="#0066CC" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userUsername}>@{item.username}</Text>
              {item.email ? <Text style={styles.userEmailText}>{item.email}</Text> : null}
              <Text style={styles.userPassword}>Password: {item.password}</Text>
              <View style={styles.formsCount}>
                <FileText size={14} color="#6C757D" />
                <Text style={styles.formsCountText}>{userForms.length} submitted form{userForms.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                void deleteUser(item.username);
              }}
            >
              <Trash2 size={20} color="#FF3B30" />
            </TouchableOpacity>
            {isExpanded ? (
              <ChevronUp size={20} color="#6C757D" />
            ) : (
              <ChevronDown size={20} color="#6C757D" />
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && userForms.length > 0 && (
          <View style={styles.formsSection}>
            <Text style={styles.formsSectionTitle}>Submitted Forms</Text>
            {userForms.map((form) => {
              const patientName = form.patientName || `${form.patientFirstName} ${form.patientLastName}`;
              const formType = form.formType === 'medical-aid' ? 'Medical Aid' : 'COIDA';
              return (
                <View key={form.id} style={styles.formItem}>
                  <View style={styles.formIcon}>
                    <FileText size={16} color="#0066CC" />
                  </View>
                  <View style={styles.formDetails}>
                    <Text style={styles.formPatientName}>{patientName}</Text>
                    <Text style={styles.formType}>{formType}</Text>
                    <Text style={styles.formDate}>{new Date(form.updatedAt).toLocaleDateString()}</Text>
                    {form.submittedBy && (
                      <Text style={styles.formSubmittedBy}>Submitted by: @{form.submittedBy}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {isExpanded && userForms.length === 0 && (
          <View style={styles.noFormsContainer}>
            <Text style={styles.noFormsText}>No submitted forms yet</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Users size={28} color="#0066CC" />
            <Text style={styles.headerTitle}>User Management</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total Registered Users: {users.length}
          </Text>
        </View>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={64} color="#CED4DA" />
          <Text style={styles.emptyTitle}>No Users Yet</Text>
          <Text style={styles.emptyDescription}>
            No users have signed up yet. They will appear here once they register.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.username}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0066CC']}
                tintColor="#0066CC"
              />
            }
          />
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={dumpStorageData}
            >
              <Text style={styles.debugButtonText}>Debug: Show Storage Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearAllUsers}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.clearAllButtonText}>Clear All Users</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#212529',
  },
  statsContainer: {
    backgroundColor: '#E7F3FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0066CC',
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  userMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#212529',
  },
  userUsername: {
    fontSize: 14,
    color: '#6C757D',
  },
  userPassword: {
    fontSize: 12,
    color: '#ADB5BD',
    fontFamily: 'monospace',
  },
  formsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  formsCountText: {
    fontSize: 12,
    color: '#6C757D',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formsSection: {
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  formsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#495057',
    marginBottom: 12,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  formIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formDetails: {
    flex: 1,
  },
  formPatientName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  formType: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  formDate: {
    fontSize: 11,
    color: '#ADB5BD',
    marginTop: 2,
  },
  formSubmittedBy: {
    fontSize: 10,
    color: '#6C757D',
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  noFormsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
    backgroundColor: '#F8F9FA',
    padding: 16,
    alignItems: 'center',
  },
  noFormsText: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#495057',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
  },
  debugButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  clearAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  clearAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  userEmailText: {
    fontSize: 12,
    color: '#0066CC',
    marginTop: 2,
  },
});
