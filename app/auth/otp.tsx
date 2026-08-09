import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  getPendingLogin,
  setPendingLogin,
  type PendingLogin,
} from "@/components/auth/pending-login";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { routeForRole } from "@/lib/auth/role-routing";
import type { User as AppUser } from "@/lib/data/types";
import { useAppStore } from "@/lib/store/app-store";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const palette = {
  ink: "#201A2D",
  muted: "#6F687B",
  primary: "#C82B1D",
  primaryDark: "#9E1F15",
  surface: "#FFFFFF",
  border: "#E9E2DC",
  field: "#FAF7F4",
  error: "#B42318",
  success: "#247A52",
};

type VerifiedUser = Auth.User & { phone?: string | null };

function mapUserForStore(user: VerifiedUser, challenge: PendingLogin): AppUser {
  const phone = user.phone ?? (challenge.channel === "phone" ? challenge.identifier : "");
  const email = user.email ?? (challenge.channel === "email" ? challenge.identifier : undefined);
  return {
    id: String(user.id),
    name: user.name?.trim() || (user.role === "customer" ? "Customer" : "Team member"),
    email: email || undefined,
    phone,
    addresses: [],
    loyaltyAccount: {
      points: 0,
      tier: "bronze",
      pointsToNextTier: 1000,
      totalEarned: 0,
      totalRedeemed: 0,
      history: [],
    },
    isGuest: false,
    role: user.role || "customer",
  };
}

export default function OTPScreen() {
  const { state, dispatch } = useAppStore();
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const inputRef = useRef<TextInput>(null);
  const initialChallenge = useMemo(() => {
    const pending = getPendingLogin();
    return pending && (!params.challengeId || pending.challengeId === params.challengeId)
      ? pending
      : null;
  }, [params.challengeId]);

  const [challenge, setChallenge] = useState<PendingLogin | null>(initialChallenge);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (challenge) requestAnimationFrame(() => inputRef.current?.focus());
  }, [challenge]);

  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH));
    if (error) setError(null);
    if (notice) setNotice(null);
  };

  const verifyCode = async () => {
    if (!challenge) return;
    if (code.length !== CODE_LENGTH) {
      setError("Enter the complete 6-digit code.");
      inputRef.current?.focus();
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const result = await Api.verifyLoginCode({ challengeId: challenge.challengeId, code });
      await Promise.all([
        Auth.setSessionToken(result.sessionToken),
        Auth.setRefreshToken(result.refreshToken),
        Auth.setUserInfo(result.user),
      ]);
      dispatch({ type: "SET_USER", payload: mapUserForStore(result.user, challenge) });
      clearPendingLogin();
      const destination = result.user.role === "customer" && !state.selectedBranch
        ? "/branch-select"
        : routeForRole(result.user.role);
      router.replace(destination as never);
    } catch {
      setError("That code is invalid or has expired. Check it and try again.");
      setCode("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    if (!challenge || resendIn > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await Api.requestLoginCode({
        channel: challenge.channel,
        identifier: challenge.identifier,
      });
      const nextChallenge: PendingLogin = {
        ...challenge,
        challengeId: result.challengeId,
        destinationHint: result.destinationHint,
        expiresInSeconds: result.expiresInSeconds,
      };
      setPendingLogin(nextChallenge);
      setChallenge(nextChallenge);
      setCode("");
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setNotice("A new verification code is on its way.");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch {
      setError("We could not resend the code. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  };

  const cancelChallenge = () => {
    clearPendingLogin();
    router.back();
  };

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.expiredContainer}>
          <View style={styles.expiredIcon}>
            <Ionicons name="time-outline" size={30} color={palette.primary} />
          </View>
          <Text style={styles.expiredTitle}>Request a new code</Text>
          <Text style={styles.expiredText}>
            This sign-in attempt is no longer available. Return to sign in and we will send a fresh code.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              clearPendingLogin();
              router.replace("/auth/login" as never);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Return to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const validityMinutes = Math.max(1, Math.ceil(challenge.expiresInSeconds / 60));

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
          <TouchableOpacity
            accessibilityLabel="Back to sign in"
            accessibilityRole="button"
            disabled={verifying || resending}
            onPress={cancelChallenge}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={palette.ink} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={["#FFF2E5", "#FFF8F1"]}
            style={styles.codeIcon}
          >
            <Ionicons
              name={challenge.channel === "phone" ? "chatbubble-ellipses-outline" : "mail-unread-outline"}
              size={31}
              color={palette.primary}
            />
          </LinearGradient>

          <Text style={styles.eyebrow}>ONE-TIME CODE</Text>
          <Text style={styles.title}>Check your {challenge.channel === "phone" ? "messages" : "email"}</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.destination}>{challenge.destinationHint}</Text>
          </Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.codeRow}
          >
            {Array.from({ length: CODE_LENGTH }, (_, index) => {
              const digit = code[index] ?? "";
              const active = index === code.length && code.length < CODE_LENGTH;
              return (
                <View
                  accessible={false}
                  key={index}
                  style={[
                    styles.codeCell,
                    digit ? styles.codeCellFilled : undefined,
                    active ? styles.codeCellActive : undefined,
                    error ? styles.codeCellError : undefined,
                  ]}
                >
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              );
            })}
            <TextInput
              ref={inputRef}
              accessibilityLabel="Six digit verification code"
              autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
              caretHidden
              editable={!verifying && !resending}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onChangeText={updateCode}
              onSubmitEditing={verifyCode}
              style={styles.hiddenCodeInput}
              textContentType="oneTimeCode"
              value={code}
            />
          </TouchableOpacity>

          <Text style={styles.validityText}>The code is valid for about {validityMinutes} minutes.</Text>

          {error ? (
            <View style={[styles.messageRow, styles.errorMessage]} accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle-outline" size={18} color={palette.error} />
              <Text style={[styles.messageText, styles.errorText]}>{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View style={[styles.messageRow, styles.successMessage]} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle-outline" size={18} color={palette.success} />
              <Text style={[styles.messageText, styles.successText]}>{notice}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={verifying || resending}
            onPress={verifyCode}
            style={[styles.primaryButton, (verifying || resending) && styles.buttonDisabled]}
          >
            {verifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Verify and continue</Text>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendArea}>
            <Text style={styles.resendQuestion}>Didn&apos;t receive the code?</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: resendIn > 0 || resending }}
              disabled={resendIn > 0 || resending || verifying}
              onPress={resendCode}
              style={styles.resendButton}
            >
              {resending ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <Text style={[styles.resendText, resendIn > 0 && styles.resendTextDisabled]}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.safetyNote}>
            <Ionicons name="lock-closed-outline" size={17} color={palette.success} />
            <Text style={styles.safetyText}>Never share this code with anyone, including our team.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.surface },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 30, paddingHorizontal: 24 },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginBottom: 30,
    marginTop: 12,
    minHeight: 42,
    paddingRight: 14,
  },
  backButtonText: { color: palette.ink, fontSize: 15, fontWeight: "700" },
  codeIcon: {
    alignItems: "center",
    borderRadius: 19,
    height: 62,
    justifyContent: "center",
    marginBottom: 24,
    width: 62,
  },
  eyebrow: { color: palette.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.7 },
  title: { color: palette.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8, marginTop: 7 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23, marginTop: 11 },
  destination: { color: palette.ink, fontWeight: "800" },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 30,
    position: "relative",
  },
  codeCell: {
    alignItems: "center",
    backgroundColor: palette.field,
    borderColor: palette.border,
    borderRadius: 13,
    borderWidth: 1.5,
    flex: 1,
    height: 58,
    justifyContent: "center",
  },
  codeCellActive: { borderColor: palette.primary, borderWidth: 2 },
  codeCellFilled: { backgroundColor: "#FFF8F1", borderColor: "#E8B8A7" },
  codeCellError: { borderColor: palette.error },
  codeDigit: { color: palette.ink, fontSize: 23, fontWeight: "800" },
  hiddenCodeInput: {
    bottom: 0,
    left: 0,
    opacity: 0.01,
    position: "absolute",
    right: 0,
    top: 0,
  },
  validityText: { color: palette.muted, fontSize: 12, marginTop: 11, textAlign: "center" },
  messageRow: { alignItems: "flex-start", borderRadius: 11, flexDirection: "row", gap: 8, marginTop: 16, padding: 11 },
  messageText: { flex: 1, fontSize: 12, lineHeight: 18 },
  errorMessage: { backgroundColor: "#FFF1F0" },
  errorText: { color: palette.error },
  successMessage: { backgroundColor: "#F1F8F4" },
  successText: { color: palette.success },
  primaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: palette.primary,
    borderRadius: 15,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: palette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  resendArea: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 23 },
  resendQuestion: { color: palette.muted, fontSize: 14 },
  resendButton: { justifyContent: "center", minHeight: 42, minWidth: 88, paddingLeft: 5 },
  resendText: { color: palette.primary, fontSize: 14, fontWeight: "800" },
  resendTextDisabled: { color: "#A59EA7" },
  safetyNote: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#F1F8F4",
    borderRadius: 11,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  safetyText: { color: "#436252", flexShrink: 1, fontSize: 11, lineHeight: 16 },
  expiredContainer: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  expiredIcon: {
    alignItems: "center",
    backgroundColor: "#FFF3E7",
    borderRadius: 22,
    height: 70,
    justifyContent: "center",
    marginBottom: 22,
    width: 70,
  },
  expiredTitle: { color: palette.ink, fontSize: 25, fontWeight: "900", textAlign: "center" },
  expiredText: { color: palette.muted, fontSize: 14, lineHeight: 22, marginTop: 10, textAlign: "center" },
});
