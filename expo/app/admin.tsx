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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Trash2, UserCheck, Users } from 'lucide-react-native';

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
  const router = useRouter();

  const loadUsers = async () => {
    try {
      console.log('[Admin] Loading users from storage');
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[Admin] Retrieved users:', usersJson);
      
      if (usersJson) {
        const parsedUsers: StoredUser[] = JSON.parse(usersJson);
        console.log('[Admin] Parsed users count:', parsedUsers.length);
        setUsers(parsedUsers);
      } else {
        console.log('[Admin] No users found in storage');
        setUsers([]);
      }
    } catch (error) {
      console.error('[Admin] Error loading users:', error);
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

  const renderUserItem = ({ item }: { item: StoredUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.iconContainer}>
          <UserCheck size={24} color="#0066CC" />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
          <Text style={styles.userPassword}>Password: {item.password}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteUser(item.username)}
      >
        <Trash2 size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Users size={28} color="#0066CC" />
            <Text style={styles.headerTitle}>User Management</Text>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
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
              style={styles.clearAllButton}
              onPress={clearAllUsers}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.clearAllButtonText}>Clear All Users</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
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
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0066CC',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
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
});
