import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, Text, StyleSheet } from "react-native";
import { trpc } from "@/lib/trpc";
import { LoadingState } from "@/components/ui/loading-state";
import { useRequireRole } from "@/hooks/use-require-role";
import { isKitchenNewOrder } from "@/lib/orders/kitchen-order-status";
import { useEffect, useState } from "react";
import { KitchenWorkspaceProvider } from "@/components/kitchen/kitchen-workspace";
import { QueryProblem } from "@/components/roles/role-portal-ui";

export default function KitchenPortalLayout() {
  const access = useRequireRole(["kitchen", "admin"]);
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const workspaceQ = trpc.kitchen.workspace.useQuery(undefined, { enabled: access.allowed, staleTime: 5 * 60_000 });
  const [branchId, setBranchId] = useState<number | null>(null);

  useEffect(() => {
    if (!workspaceQ.data?.branches.length) return;
    setBranchId((current) => {
      const validCurrent = current !== null && workspaceQ.data.branches.some((branch) => branch.id === current);
      return validCurrent ? current : (workspaceQ.data.assignedBranchId ?? workspaceQ.data.branches[0].id);
    });
  }, [workspaceQ.data]);

  const { data: activeOrders = [] } = trpc.admin.activeOrders.useQuery({ branchId: branchId ?? undefined }, {
    enabled: access.allowed && branchId !== null,
    refetchInterval: 30_000,
  });
  const pendingCount = activeOrders.filter((order) => isKitchenNewOrder(order.status) || order.status === 'accepted' || order.status === 'preparing').length;

  if (access.loading) return <LoadingState fullScreen message="Opening the kitchen workspace..." />;
  if (!access.allowed) return null;
  if (workspaceQ.isError) {
    return <View style={s.problem}><QueryProblem accent="#D97706" title="Kitchen branch unavailable" message="We could not load your assigned branch. Refresh before handling orders or stock." onRetry={() => workspaceQ.refetch()} /></View>;
  }
  if (workspaceQ.isLoading || !workspaceQ.data || branchId === null) return <LoadingState fullScreen message="Loading your assigned kitchen branch..." />;

  return (
    <KitchenWorkspaceProvider value={{ branchId, branches: workspaceQ.data.branches, canSwitchBranches: workspaceQ.data.canSwitchBranches, setBranchId }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D97706',
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
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="list.bullet.rectangle" color={color} />
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="building.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} />,
        }}
      />
    </Tabs>
    </KitchenWorkspaceProvider>
  );
}

const s = StyleSheet.create({
  problem: { backgroundColor: '#FFFBEB', flex: 1, justifyContent: 'center', padding: 20 },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#D97706', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
