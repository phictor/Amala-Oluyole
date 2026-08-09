import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { clearPersistedSensitiveState } from "@/lib/store/app-store";
import { useAppStore } from "@/lib/store/app-store";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useAuth(options?: { autoFetch?: boolean }) {
  const { dispatch } = useAppStore();
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUser = await Api.getMe();
      if (!apiUser) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }
      const next: Auth.User = { ...apiUser, lastSignedIn: new Date(apiUser.lastSignedIn) };
      await Auth.setUserInfo(next);
      setUser(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Authentication failed"));
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(async () => {
    try { await Api.logout(); } catch { /* local cleanup must still complete */ }
    await Promise.all([Auth.removeSessionToken(), Auth.clearUserInfo(), clearPersistedSensitiveState()]);
    dispatch({ type: "LOGOUT" });
    setUser(null);
    setError(null);
    router.replace("/auth/login" as never);
  }, [dispatch]);

  useEffect(() => { if (autoFetch) void fetchUser(); else setLoading(false); }, [autoFetch, fetchUser]);
  return { user, loading, error, isAuthenticated: useMemo(() => Boolean(user), [user]), refresh: fetchUser, logout };
}
