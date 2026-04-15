import { Tabs, useRouter } from "expo-router";
import { Home, LogOut, FolderOpen, Shield, ListChecks } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, Alert } from "react-native";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_EMAILS } from "@/constants/procedures";

export default function TabLayout() {
  const auth = useAuth();
  const router = useRouter();

  if (!auth || !auth.logout) {
    return null;
  }

  const { logout, user } = auth;
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login' as never);
          },
        },
      ]
    );
  };

  const LogoutBtn = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <LogOut size={22} color={Colors.primary} />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: true,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.border,
        } as any,
        headerTitleStyle: {
          fontWeight: '700' as const,
          color: Colors.text,
          fontSize: 17,
        },
        headerRight: () => <LogoutBtn />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="worklist"
        options={{
          title: "Worklist",
          tabBarIcon: ({ color }) => <ListChecks size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "My Forms",
          tabBarIcon: ({ color }) => <FolderOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medical-aid"
        options={{
          href: null,
          title: "Medical Aid Form",
        }}
      />
      <Tabs.Screen
        name="coida"
        options={{
          href: null,
          title: "COIDA Form",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Portal",
          tabBarIcon: ({ color }) => <Shield size={22} color={color} />,
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
