import { Tabs, useRouter } from "expo-router";
import { Home, LogOut, FolderOpen, Shield, ListChecks, BarChart2 } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, Alert } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAILS = ['paul@btstech.co.za', 'allan@medimarketing100.co.za'];

export default function TabLayout() {
  const auth = useAuth();
  const router = useRouter();

  if (!auth || !auth.logout) return null;

  const { logout, user } = auth;
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login' as never);
        },
      },
    ]);
  };

  const LogoutBtn = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <LogOut size={24} color={Colors.light.tint} />
    </TouchableOpacity>
  );

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors.light.tint, headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} />,
          headerRight: () => <LogoutBtn />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "My Forms",
          tabBarIcon: ({ color }) => <FolderOpen color={color} />,
          headerRight: () => <LogoutBtn />,
        }}
      />
      <Tabs.Screen
        name="worklist"
        options={{
          title: "Worklist",
          tabBarIcon: ({ color }) => <ListChecks color={color} />,
          headerRight: () => <LogoutBtn />,
        }}
      />
      <Tabs.Screen name="medical-aid" options={{ href: null }} />
      <Tabs.Screen name="coida" options={{ href: null }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color }) => <Shield color={color} />,
          href: isAdmin ? undefined : null,
          headerRight: () => <LogoutBtn />,
        }}
      />
      <Tabs.Screen
        name="manager"
        options={{
          title: "Portal",
          tabBarIcon: ({ color }) => <BarChart2 color={color} />,
          href: isAdmin ? undefined : null,
          headerRight: () => <LogoutBtn />,
        }}
      />
    </Tabs>
  );
}
