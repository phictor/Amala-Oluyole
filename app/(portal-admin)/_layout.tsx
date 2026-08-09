import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AdminMenu } from "@/components/admin-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { useRequireRole } from "@/hooks/use-require-role";

export default function AdminPortalLayout() {
  const { allowed, loading } = useRequireRole(["admin", "manager"]);
  if (loading) return <LoadingState fullScreen message="Checking access..." />;
  if (!allowed) return null;

  return (
    <View style={s.container}>
      <Stack screenOptions={{ headerShown: false }} />
      <AdminMenu />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
});
