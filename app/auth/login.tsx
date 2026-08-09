import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  clearPendingLogin,
  setPendingLogin,
  type LoginChannel,
} from "@/components/auth/pending-login";
import * as Api from "@/lib/_core/api";
import { useAppStore } from "@/lib/store/app-store";

const LOGO_CHEF = require("@/assets/images/logo-chef.png");

const palette = {
  ink: "#201A2D",
  muted: "#6F687B",
  primary: "#C82B1D",
  primaryDark: "#9E1F15",
  cream: "#FFF8F0",
  surface: "#FFFFFF",
  border: "#E9E2DC",
  field: "#FAF7F4",
  error: "#B42318",
  success: "#247A52",
};

function normalizeNigerianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("234")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^[789]\d{9}$/.test(digits) ? `+234${digits}` : null;
}

function cleanPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length > 10) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatPhoneInput(value: string): string {
  return [value.slice(0, 3), value.slice(3, 6), value.slice(6, 10)]
    .filter(Boolean)
    .join(" ");
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export default function LoginScreen() {
  const { dispatch } = useAppStore();
  const inputRef = useRef<TextInput>(null);
  const [channel, setChannel] = useState<LoginChannel>("phone");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayValue = useMemo(
    () => (channel === "phone" ? formatPhoneInput(value) : value),
    [channel, value],
  );

  const selectChannel = (nextChannel: LoginChannel) => {
    if (loading || channel === nextChannel) return;
    setChannel(nextChannel);
    setValue("");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleValueChange = (nextValue: string) => {
    setValue(channel === "phone" ? cleanPhoneInput(nextValue) : nextValue.slice(0, 254));
    if (error) setError(null);
  };

  const requestCode = async () => {
    const identifier =
      channel === "phone" ? normalizeNigerianPhone(value) : normalizeEmail(value);

    if (!identifier) {
      setError(
        channel === "phone"
          ? "Enter a valid Nigerian mobile number, for example 0801 234 5678."
          : "Enter a valid email address, for example name@example.com.",
      );
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const challenge = await Api.requestLoginCode({ channel, identifier });
      setPendingLogin({
        challengeId: challenge.challengeId,
        channel,
        identifier,
        destinationHint: challenge.destinationHint,
        expiresInSeconds: challenge.expiresInSeconds,
      });
      router.push({
        pathname: "/auth/otp",
        params: { challengeId: challenge.challengeId },
      } as never);
    } catch {
      setError("We could not send a code right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    clearPendingLogin();
    dispatch({ type: "SET_GUEST", payload: true });
    router.replace("/branch-select" as never);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#FFF4E8", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.logoShell}>
              <ExpoImage source={LOGO_CHEF} style={styles.logo} contentFit="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>Amala Oluyole</Text>
              <Text style={styles.brandLine}>Good food. Made for everyone.</Text>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.eyebrow}>WELCOME</Text>
            <Text style={styles.title}>Sign in your way</Text>
            <Text style={styles.subtitle}>
              Use your phone number or email. We will send a one-time code—no password to remember.
            </Text>

            <View style={styles.segmentedControl} accessibilityRole="tablist">
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: channel === "phone" }}
                accessibilityLabel="Sign in with phone number"
                onPress={() => selectChannel("phone")}
                style={[styles.segment, channel === "phone" && styles.segmentActive]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color={channel === "phone" ? palette.primary : palette.muted}
                />
                <Text style={[styles.segmentText, channel === "phone" && styles.segmentTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: channel === "email" }}
                accessibilityLabel="Sign in with email address"
                onPress={() => selectChannel("email")}
                style={[styles.segment, channel === "email" && styles.segmentActive]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={channel === "email" ? palette.primary : palette.muted}
                />
                <Text style={[styles.segmentText, channel === "email" && styles.segmentTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              {channel === "phone" ? "Mobile number" : "Email address"}
            </Text>
            <View style={[styles.inputShell, error && styles.inputShellError]}>
              {channel === "phone" ? (
                <>
                  <View style={styles.countryCode}>
                    <Text style={styles.flag} accessibilityElementsHidden>
                      🇳🇬
                    </Text>
                    <Text style={styles.countryCodeText}>+234</Text>
                  </View>
                  <View style={styles.inputDivider} />
                </>
              ) : (
                <Ionicons name="mail-outline" size={20} color={palette.muted} />
              )}
              <TextInput
                ref={inputRef}
                accessibilityLabel={channel === "phone" ? "Nigerian mobile number" : "Email address"}
                autoCapitalize="none"
                autoComplete={channel === "phone" ? "tel" : "email"}
                autoCorrect={false}
                editable={!loading}
                keyboardType={channel === "phone" ? "phone-pad" : "email-address"}
                onChangeText={handleValueChange}
                onSubmitEditing={requestCode}
                placeholder={channel === "phone" ? "801 234 5678" : "name@example.com"}
                placeholderTextColor="#A8A0AA"
                returnKeyType="send"
                style={styles.input}
                textContentType={channel === "phone" ? "telephoneNumber" : "emailAddress"}
                value={displayValue}
              />
            </View>

            {channel === "phone" && !error ? (
              <Text style={styles.helperText}>Nigeria (+234) is selected. You can enter 080… or 80…</Text>
            ) : null}
            {error ? (
              <View style={styles.errorRow} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={17} color={palette.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Send verification code by ${channel}`}
              disabled={loading}
              onPress={requestCode}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send verification code</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or browse first</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={continueAsGuest}
              style={styles.guestButton}
            >
              <View style={styles.guestIcon}>
                <Ionicons name="restaurant-outline" size={21} color={palette.primary} />
              </View>
              <View style={styles.guestCopy}>
                <Text style={styles.guestTitle}>Continue as guest</Text>
                <Text style={styles.guestSubtitle}>Explore the menu and choose a branch</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </TouchableOpacity>

            <View style={styles.roleNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={palette.success} />
              <Text style={styles.roleNoteText}>
                Team member? Sign in here too. Your assigned workspace opens automatically.
              </Text>
            </View>

            <Text style={styles.terms}>
              By continuing, you agree to the Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.surface },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    alignItems: "center",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    minHeight: 150,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  logoShell: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#F0DED0",
    borderRadius: 25,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    shadowColor: "#7A2A18",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    width: 82,
  },
  logo: { height: 70, width: 70 },
  brandCopy: { flexShrink: 1 },
  brand: { color: palette.ink, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  brandLine: { color: palette.muted, fontSize: 13, fontWeight: "500", marginTop: 5 },
  content: { paddingBottom: 28, paddingHorizontal: 24, paddingTop: 28 },
  eyebrow: { color: palette.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.7 },
  title: { color: palette.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8, marginTop: 6 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23, marginTop: 9 },
  segmentedControl: {
    backgroundColor: palette.field,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 24,
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 45,
  },
  segmentActive: {
    backgroundColor: palette.surface,
    shadowColor: "#2C1721",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  segmentText: { color: palette.muted, fontSize: 15, fontWeight: "700" },
  segmentTextActive: { color: palette.primary },
  inputLabel: { color: palette.ink, fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 22 },
  inputShell: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 15,
    borderWidth: 1.5,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  inputShellError: { borderColor: palette.error },
  countryCode: { alignItems: "center", flexDirection: "row", gap: 7 },
  flag: { fontSize: 18 },
  countryCodeText: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  inputDivider: { backgroundColor: palette.border, height: 25, marginHorizontal: 13, width: 1 },
  input: { color: palette.ink, flex: 1, fontSize: 16, minHeight: 54, paddingHorizontal: 10, paddingVertical: 0 },
  helperText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  errorRow: { alignItems: "flex-start", flexDirection: "row", gap: 7, marginTop: 9 },
  errorText: { color: palette.error, flex: 1, fontSize: 12, lineHeight: 17 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 15,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: palette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: 12, marginVertical: 22 },
  dividerLine: { backgroundColor: palette.border, flex: 1, height: 1 },
  dividerText: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  guestButton: {
    alignItems: "center",
    backgroundColor: palette.cream,
    borderColor: "#F1DDC9",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  guestIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  guestCopy: { flex: 1, marginHorizontal: 12 },
  guestTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  guestSubtitle: { color: palette.muted, fontSize: 12, marginTop: 3 },
  roleNote: {
    alignItems: "flex-start",
    backgroundColor: "#F1F8F4",
    borderRadius: 12,
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
    padding: 12,
  },
  roleNoteText: { color: "#436252", flex: 1, fontSize: 12, lineHeight: 18 },
  terms: { color: "#948C96", fontSize: 11, lineHeight: 17, marginTop: 18, textAlign: "center" },
});
