import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { RolePortalGate } from "@/components/roles/role-portal-ui";
import { IconSymbol } from "@/components/ui";
import { useRequireRole } from "@/hooks/use-require-role";
import { trpc } from "@/lib/trpc";

const STAFF = "#C45122";

export default function StaffPortalLayout() {
  const insets = useSafeAreaInsets();
  const { allowed, loading } = useRequireRole(["staff", "manager", "admin"]);
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const ordersQ = trpc.admin.activeOrders.useQuery(undefined, {
    enabled: allowed,
    refetchInterval: 20_000,
  });
  const attentionCount = (ordersQ.data ?? []).filter((order) => ["payment_confirmed", "ready"].includes(order.status)).length;

  return (
    <RolePortalGate accent={STAFF} allowed={allowed} loading={loading} workspace="Staff">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: STAFF,
          tabBarInactiveTintColor: "#7D7A77",
          tabBarButton: HapticTab,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#EEE6DF",
            borderTopWidth: 1,
            height: 58 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 7,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Today",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="house.fill" size={24} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => (
              <View>
                <IconSymbol color={color} name="list.bullet.rectangle" size={24} />
                {attentionCount > 0 ? (
                  <View style={{ alignItems: "center", backgroundColor: STAFF, borderColor: "#FFFFFF", borderRadius: 8, borderWidth: 1.5, height: 16, justifyContent: "center", minWidth: 16, paddingHorizontal: 3, position: "absolute", right: -8, top: -5 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "900" }}>{attentionCount > 9 ? "9+" : attentionCount}</Text>
                  </View>
                ) : null}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="dispatch"
          options={{
            title: "Dispatch",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="bicycle" size={24} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="gearshape.fill" size={24} />,
          }}
        />
      </Tabs>
    </RolePortalGate>
  );
}
