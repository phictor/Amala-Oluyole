import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, Text, StyleSheet } from "react-native";
import { trpc } from "@/lib/trpc";
import { LoadingState } from "@/components/ui/loading-state";
import { useRequireRole } from "@/hooks/use-require-role";
import { useRiderLocationBroadcast } from "@/hooks/use-rider-location-broadcast";

export default function RiderPortalLayout() {
  const access = useRequireRole(["rider"]);
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const { data: myOrders = [] } = trpc.rider.myOrders.useQuery(undefined, {
    enabled: access.allowed,
    refetchInterval: 30_000,
  });
  const { data: riderProfile } = trpc.rider.profile.useQuery(undefined, {
    enabled: access.allowed,
    refetchInterval: 15_000,
  });
  const activeDeliveryId = myOrders.find((order) => ['rider_assigned', 'out_for_delivery'].includes(order.status))?.id;
  useRiderLocationBroadcast({ enabled: Boolean(riderProfile?.isOnline), orderId: activeDeliveryId });
  const activeCount = myOrders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').length;

  if (access.loading) return <LoadingState fullScreen message="Opening your delivery workspace..." />;
  if (!access.allowed) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Deliveries",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="bicycle" color={color} />
              {activeCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{activeCount > 9 ? '9+' : activeCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#059669', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
