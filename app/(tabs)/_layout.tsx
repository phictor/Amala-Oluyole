import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store/app-store";
import { View, Text, StyleSheet } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useAppStore();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const cartCount = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const notifCount = state.unreadNotificationCount;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C0392B',
        tabBarInactiveTintColor: '#8B6F5E',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#FDF8F3',
          borderTopColor: '#E8D5C4',
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
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
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="person.fill" color={color} />
              {notifCount > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#C0392B', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
