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
import { useAuth } from "./use-auth";

export type AppRole = "customer" | "admin" | "kitchen" | "rider";

export function useRequireRole(allowedRoles: AppRole[]) {
  const { user, loading } = useAuth();
  const redirectedRef = useRef(false);

  const role = (user as any)?.role as AppRole | undefined;
  const allowed = !loading && !!user && !!role && allowedRoles.includes(role);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Not authenticated — go to login
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/login" as any);
      }
      return;
    }
    if (!role || !allowedRoles.includes(role)) {
      // Authenticated but wrong role — go back to home
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/" as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, role]);

  return { allowed, loading, role };
}
