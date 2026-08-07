/**
 * useRequireRole — redirects the user away from the current screen if their
 * role is not in the allowed list.
 *
 * Usage:
 *   const { allowed, loading } = useRequireRole(["admin"]);
 *   if (loading) return <LoadingState fullScreen />;
 *   if (!allowed) return null; // redirect already fired
 *
 * The hook reads the role from the auth context (Auth.User.role). The role
 * is populated from the /api/auth/me response which already returns `role`.
 */
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useAppStore } from "@/lib/store/app-store";

export type AppRole = "customer" | "admin" | "kitchen" | "rider" | "manager";

/**
 * Reads role from the app-store (populated by AuthSyncBridge on login) so
 * there is no re-fetch race condition when navigating between portal screens.
 */
export function useRequireRole(allowedRoles: AppRole[]) {
  const { state } = useAppStore();
  const redirectedRef = useRef(false);

  const role = state.user?.role as AppRole | undefined;
  // Loading only while AsyncStorage hydration is still in progress
  const loading = !state.hydrated;
  const allowed = state.isAuthenticated && !state.isGuest && !!role && allowedRoles.includes(role);

  useEffect(() => {
    // Don't redirect while the app is still hydrating
    if (loading) return;
    // If not authenticated after hydration, let the root layout handle redirect
    if (!state.isAuthenticated || state.isGuest) return;
    if (!role || !allowedRoles.includes(role)) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        if (role === "admin" || role === "manager") {
          router.replace("/(portal-admin)" as any);
        } else if (role === "kitchen") {
          router.replace("/(portal-kitchen)" as any);
        } else if (role === "rider") {
          router.replace("/(portal-rider)" as any);
        } else {
          router.replace("/(tabs)" as any);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, state.isAuthenticated, state.isGuest, role]);

  return { allowed, loading, role };
}
