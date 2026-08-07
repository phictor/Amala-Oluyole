import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { getPreviewExtra, isNonProductionVariant } from "@/lib/preview-config";

export function EnvironmentBanner() {
  const extra = getPreviewExtra();
  if (!isNonProductionVariant(extra)) return null;
  const label = extra.appVariant === "preview" ? "TEST ENVIRONMENT" : "DEVELOPMENT BUILD";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}. Open preview information.`}
      onPress={() => router.push("/preview-info" as never)}
      style={[styles.banner, extra.appVariant === "development" && styles.development]}
    >
      <Text style={styles.text}>{label} · TAP FOR BUILD INFO</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "#F2A900", paddingHorizontal: 12, paddingVertical: 7, alignItems: "center" },
  development: { backgroundColor: "#0EA5E9" },
  text: { color: "#15103F", fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
});
