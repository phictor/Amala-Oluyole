import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Updates from "expo-updates";
import { getFeedbackIssueUrl, getPreviewMetadata } from "@/lib/preview-config";

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
}

export default function PreviewInfoScreen() {
  const metadata = useMemo(() => getPreviewMetadata(), []);
  const [description, setDescription] = useState("");
  const [checking, setChecking] = useState(false);

  const checkForUpdate = async () => {
    if (!Updates.isEnabled || __DEV__) {
      Alert.alert("Updates unavailable", "Update checks run in installed preview builds, not local development mode.");
      return;
    }
    try {
      setChecking(true);
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert("Up to date", "This preview already has the newest compatible update.");
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert("Update ready", "Restart now to apply the downloaded preview update.", [
        { text: "Later", style: "cancel" },
        { text: "Restart", onPress: () => Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert("Update check failed", "Confirm internet access and that this build is on bytechain-preview.");
    } finally {
      setChecking(false);
    }
  };

  const reportIssue = async () => {
    const url = getFeedbackIssueUrl(description, metadata);
    if (!(await Linking.canOpenURL(url))) {
      Alert.alert("Cannot open browser", "Report the defect in the repository issue tracker.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.badge}><Text style={styles.badgeText}>TEST ENVIRONMENT</Text></View>
      <Text style={styles.title}>Preview Information</Text>
      <Text style={styles.subtitle}>Safe build metadata for testers and defect reports. No credentials or infrastructure secrets are shown.</Text>
      <View style={styles.card}>
        <InfoRow label="Environment" value={metadata.environment} />
        <InfoRow label="Variant" value={metadata.variant} />
        <InfoRow label="Version" value={metadata.version} />
        <InfoRow label="Build number" value={metadata.buildNumber} />
        <InfoRow label="Git commit" value={metadata.commitSha} />
        <InfoRow label="EAS update ID" value={metadata.updateId} />
        <InfoRow label="Runtime version" value={metadata.runtimeVersion} />
        <InfoRow label="Update channel" value={metadata.updateChannel} />
        <InfoRow label="API environment" value={metadata.apiEnvironment} />
        <InfoRow label="Database environment" value={metadata.databaseEnvironment} />
        <InfoRow label="Build date" value={metadata.buildDate} />
      </View>
      <TouchableOpacity disabled={checking} onPress={checkForUpdate} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{checking ? "Checking…" : "Check for compatible update"}</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Report a defect</Text>
      <TextInput multiline maxLength={2_000} onChangeText={setDescription} placeholder="Screen, account role, action, expected result, and actual result" style={styles.input} value={description} />
      <TouchableOpacity onPress={reportIssue} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Open safe issue report</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 56, paddingBottom: 48, backgroundColor: "#FFF", flexGrow: 1 },
  badge: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#F2A900", paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#15103F", fontWeight: "900", fontSize: 12, letterSpacing: 0.8 },
  title: { color: "#201060", fontSize: 28, fontWeight: "900", marginTop: 16 },
  subtitle: { color: "#6B6490", fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  card: { borderWidth: 1, borderColor: "#E8E6F4", borderRadius: 16, overflow: "hidden" },
  row: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8E6F4" },
  label: { color: "#6B6490", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { color: "#201060", fontSize: 14, fontWeight: "600", marginTop: 4 },
  primaryButton: { marginTop: 18, backgroundColor: "#201060", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  primaryButtonText: { color: "#FFF", fontWeight: "800" },
  sectionTitle: { color: "#201060", fontSize: 18, fontWeight: "800", marginTop: 28, marginBottom: 10 },
  input: { minHeight: 140, borderWidth: 1, borderColor: "#C9C5DD", borderRadius: 14, padding: 14, textAlignVertical: "top", color: "#201060" },
  secondaryButton: { marginTop: 12, borderColor: "#D02010", borderWidth: 2, paddingVertical: 13, borderRadius: 14, alignItems: "center" },
  secondaryButtonText: { color: "#D02010", fontWeight: "800" },
});
