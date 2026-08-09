import { Redirect } from "expo-router";
import { LoadingState } from "@/components/ui";
import { useRequireRole } from "@/hooks/use-require-role";

export default function LegacyKitchenRedirect() {
  const access = useRequireRole(["kitchen", "admin"]);
  if (access.loading) return <LoadingState fullScreen message="Opening the kitchen workspace..." />;
  if (!access.allowed) return null;
  return <Redirect href="/(portal-kitchen)" />;
}
