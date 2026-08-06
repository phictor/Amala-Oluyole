import "@/global.css";
import { AppProvider } from "@/lib/store/app-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import * as Auth from "@/lib/_core/auth";
import { useAppStore } from "@/lib/store/app-store";
import * as Notifications from "expo-notifications";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { router } from "expo-router";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** Bridges OAuth SecureStore session with the AsyncStorage-backed app-store. */
function AuthSyncBridge() {
  const { state, dispatch } = useAppStore();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const syncAuth = async () => {
      const token = await Auth.getSessionToken();
      if (!token) {
        if (state.isAuthenticated && !state.isGuest) dispatch({ type: 'LOGOUT' });
        return;
      }
      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        dispatch({
          type: 'SET_USER',
          payload: {
            id: String(cachedUser.id ?? ''),
            name: cachedUser.name ?? 'User',
            email: cachedUser.email ?? undefined,
            phone: '',
            addresses: [],
            loyaltyAccount: { points: 0, tier: 'bronze', pointsToNextTier: 1000, totalEarned: 0, totalRedeemed: 0, history: [] },
            isGuest: false,
            role: cachedUser.role ?? 'customer',
          },
        });
        // Redirect staff roles away from customer tabs immediately
        const role = cachedUser.role ?? 'customer';
        if (role === 'admin' || role === 'manager') {
          router.replace('/(portal-admin)' as any);
        } else if (role === 'kitchen') {
          router.replace('/(portal-kitchen)' as any);
        } else if (role === 'rider') {
          router.replace('/(portal-rider)' as any);
        }
      } else if (!state.isAuthenticated) {
        dispatch({
          type: 'SET_USER',
          payload: {
            id: '', name: '', email: undefined, phone: '', addresses: [],
            loyaltyAccount: { points: 0, tier: 'bronze', pointsToNextTier: 1000, totalEarned: 0, totalRedeemed: 0, history: [] },
            isGuest: false, role: 'customer',
          },
        });
      }
    };
    const t = setTimeout(syncAuth, 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Registers the Expo push token after the user logs in.
 * Must be rendered inside the tRPC provider so useMutation works.
 */
function PushTokenRegistrar() {
  const { state } = useAppStore();
  const registerPushToken = trpc.profile.registerPushToken.useMutation();
  const registered = useRef(false);

  useEffect(() => {
    if (!state.isAuthenticated || state.isGuest || registered.current) return;
    if (Platform.OS === 'web') return;
    registered.current = true;
    const register = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        registerPushToken.mutate({ token: tokenData.data, platform });
      } catch {
        // Non-critical — push notifications are optional
      }
    };
    register();
  }, [state.isAuthenticated, state.isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Set foreground notification handler once at the root level
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Amala Oluyole',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D02010',
      }).catch(() => {});
    }
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* PushTokenRegistrar must be inside tRPC provider */}
          <PushTokenRegistrar />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(portal-admin)" />
            <Stack.Screen name="(portal-kitchen)" />
            <Stack.Screen name="(portal-rider)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          {/* admin/ group: transaction-report, rider-tracking, add-meal */}
          {/* These are registered automatically by Expo Router file-based routing */}
          {/* but we explicitly declare them here to ensure they appear in the Stack */}
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <AppProvider>
      <AuthSyncBridge />
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
    <AuthSyncBridge />
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
    </AppProvider>
  );
}
