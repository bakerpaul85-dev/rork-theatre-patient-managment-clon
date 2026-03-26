import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  username: string;
  name: string;
  email: string;
}

interface StoredUser {
  username: string;
  password: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (username: string, password: string, name: string, email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<'success' | 'not_found'>;
}

const USERS_STORAGE_KEY = '@theatre_users';
const SESSION_STORAGE_KEY = '@theatre_session';

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log('[Session] Loading saved session');
        const sessionJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionJson) {
          const savedUser: User = JSON.parse(sessionJson);
          console.log('[Session] Found saved session for user:', savedUser.username);
          
          const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
          const users: StoredUser[] = usersJson ? JSON.parse(usersJson) : [];
          const userExists = users.find(u => u.username === savedUser.username);
          
          if (userExists) {
            console.log('[Session] User validated, restoring session');
            setUser(savedUser);
          } else {
            console.log('[Session] User no longer exists, clearing session');
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } else {
          console.log('[Session] No saved session found');
        }
      } catch (error) {
        console.error('[Session] Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    void loadSession();
  }, []);

  const signUp = useCallback(async (username: string, password: string, name: string, email: string): Promise<boolean> => {
    try {
      console.log('[SignUp] Starting sign up process for email:', email, 'username:', username);
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[SignUp] Retrieved users from storage:', usersJson);
      const users: StoredUser[] = usersJson ? JSON.parse(usersJson) : [];

      const existingUser = users.find(u => (u.email?.toLowerCase() === email?.toLowerCase()) || u.username === username);
      if (existingUser) {
        console.log('[SignUp] User already exists');
        return false;
      }

      const newStoredUser: StoredUser = {
        username,
        password,
        name,
        email: (email ?? '').toLowerCase(),
      };

      users.push(newStoredUser);
      const updatedUsersJson = JSON.stringify(users);
      console.log('[SignUp] Saving users to storage:', updatedUsersJson);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, updatedUsersJson);
      
      const verifyJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[SignUp] Verification - users after save:', verifyJson);

      const newUser: User = {
        username,
        name,
        email: (email ?? '').toLowerCase(),
      };
      setUser(newUser);
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
      console.log('[SignUp] Sign up successful, session saved');
      return true;
    } catch (error) {
      console.error('[SignUp] Error during sign up:', error);
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const normalizedEmail = (email ?? '').toLowerCase().trim();
      console.log('[Login] Starting login process for email:', normalizedEmail);
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      console.log('[Login] Retrieved users from storage:', usersJson);
      const users: StoredUser[] = usersJson ? JSON.parse(usersJson) : [];
      console.log('[Login] Parsed users array:', users);
      console.log('[Login] Number of registered users:', users.length);

      const storedUser = users.find(u => {
        console.log('[Login] Checking user email:', u.email, 'against input:', normalizedEmail);
        console.log('[Login] Password match:', u.password === password);
        return (u.email ?? '').toLowerCase() === normalizedEmail && u.password === password;
      });
      
      if (storedUser) {
        console.log('[Login] User found, logging in');
        const newUser: User = {
          username: storedUser.username,
          name: storedUser.name,
          email: storedUser.email,
        };
        setUser(newUser);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
        console.log('[Login] Session saved');
        return true;
      }
      
      console.log('[Login] Invalid credentials - no matching user found');
      return false;
    } catch (error) {
      console.error('[Login] Error during login:', error);
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<'success' | 'not_found'> => {
    try {
      const normalizedEmail = (email ?? '').toLowerCase().trim();
      console.log('[ResetPassword] Attempting password reset for:', normalizedEmail);
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersJson ? JSON.parse(usersJson) : [];

      const userIndex = users.findIndex(u => (u.email ?? '').toLowerCase() === normalizedEmail);
      if (userIndex === -1) {
        console.log('[ResetPassword] No account found for email:', normalizedEmail);
        return 'not_found';
      }

      users[userIndex].password = newPassword;
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      console.log('[ResetPassword] Password reset successful for:', normalizedEmail);
      return 'success';
    } catch (error) {
      console.error('[ResetPassword] Error:', error);
      return 'not_found';
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[Logout] Clearing session');
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
      console.log('[Logout] Logout successful');
    } catch (error) {
      console.error('[Logout] Error during logout:', error);
    }
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    login,
    signUp,
    logout,
    resetPassword,
  }), [user, isLoading, login, signUp, logout, resetPassword]);
});
