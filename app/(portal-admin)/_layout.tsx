import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AdminMenu } from "@/components/admin-menu";

export default function AdminPortalLayout() {
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
