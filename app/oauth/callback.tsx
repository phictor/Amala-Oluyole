import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { routeForRole } from "@/lib/auth/role-routing";
import { useAppStore } from "@/lib/store/app-store";

export default function OAuthCallback() {
  const { dispatch } = useAppStore();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let active = true;
    (async () => {
      if (params.error || !params.code || !params.state) throw new Error("Invalid sign-in callback");
      const result = await Api.exchangeOAuthCode(params.code, params.state);
      await Auth.setSessionToken(result.sessionToken);
      const currentUser = { ...result.user, lastSignedIn: new Date(result.user.lastSignedIn) };
      await Auth.setUserInfo(currentUser);
      if (active) {
        dispatch({
          type: "SET_USER",
          payload: {
            id: String(currentUser.id),
            name: currentUser.name ?? "User",
            email: currentUser.email ?? undefined,
            phone: currentUser.phone ?? "",
            addresses: [],
            loyaltyAccount: { points: 0, tier: "bronze", pointsToNextTier: 1000, totalEarned: 0, totalRedeemed: 0, history: [] },
            isGuest: false,
            role: currentUser.role ?? "customer",
          },
        });
        router.replace(routeForRole(currentUser.role) as never);
      }
    })().catch(() => {
      if (active) setMessage("Sign in could not be completed. Please return and try again.");
    });
    return () => { active = false; };
  }, [dispatch, params.code, params.error, params.state]);

  return <View style={styles.container}><ActivityIndicator size="large" color="#D02010" /><Text style={styles.message}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  message: { marginTop: 16, textAlign: "center", color: "#201060", fontSize: 16 },
});
