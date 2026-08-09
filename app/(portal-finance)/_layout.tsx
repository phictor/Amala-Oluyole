import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui";
import { RolePortalGate } from "@/components/roles/role-portal-ui";
import { useRequireRole } from "@/hooks/use-require-role";

const FINANCE = "#176B73";

export default function FinancePortalLayout() {
  const insets = useSafeAreaInsets();
  const { allowed, loading } = useRequireRole(["finance", "admin"]);
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <RolePortalGate accent={FINANCE} allowed={allowed} loading={loading} workspace="Finance">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: FINANCE,
          tabBarInactiveTintColor: "#7A8494",
          tabBarButton: HapticTab,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#E4EAED",
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
            title: "Overview",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="house.fill" size={24} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: "Transactions",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="creditcard.fill" size={24} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color }) => <IconSymbol color={color} name="person.fill" size={24} />,
          }}
        />
      </Tabs>
    </RolePortalGate>
  );
}
