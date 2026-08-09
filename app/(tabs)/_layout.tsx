import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@/lib/store/app-store";
import { routeForRole } from "@/lib/auth/role-routing";
import { LoadingState } from "@/components/ui/loading-state";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { state } = useAppStore();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const cartCount = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const accessLoading = !state.hydrated || !state.authResolved;
  const customerAccess = state.isGuest || (state.isAuthenticated && state.user?.role === "customer");

  useEffect(() => {
    if (accessLoading || customerAccess) return;
    router.replace((state.isAuthenticated ? routeForRole(state.user?.role) : "/auth/login") as never);
  }, [accessLoading, customerAccess, state.isAuthenticated, state.user?.role]);

  if (accessLoading) return <LoadingState fullScreen message="Opening the customer app..." />;
  if (!customerAccess) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D02010',
        tabBarInactiveTintColor: '#6B6490',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E6F4',
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="bag.fill" color={color} />
              {cartCount > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet.rectangle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="person.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          href: null,
          title: "Contact",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="phone.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#D02010', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
