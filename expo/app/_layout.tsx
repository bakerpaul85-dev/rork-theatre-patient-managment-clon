import '@/utils/textEncodingPolyfill';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { trpc, trpcClient } from "@/lib/trpc";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FormsProvider } from "@/contexts/FormsContext";
import { CloudSyncProvider, useCloudSync } from "@/contexts/CloudSyncContext";
import { cloudSyncBridge } from "@/utils/cloudSyncBridge";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function CloudSyncBridgeWirer() {
  const { syncFormToCloud, deleteFormFromCloud, isConfigured } = useCloudSync();
  useEffect(() => {
    if (!isConfigured) return;
    cloudSyncBridge.onSync((form) => { void syncFormToCloud(form); });
    cloudSyncBridge.onDelete((formId) => { void deleteFormFromCloud(formId); });
  }, [isConfigured, syncFormToCloud, deleteFormFromCloud]);
  return null;
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(tabs)';
    if (!user && inAuthGroup) {
      router.replace('/login' as never);
    } else if (user && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ title: "Admin" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FormsProvider>
            <CloudSyncProvider>
              <CloudSyncBridgeWirer />
              <GestureHandlerRootView style={styles.container}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </CloudSyncProvider>
          </FormsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
