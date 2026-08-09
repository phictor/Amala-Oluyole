import { Redirect } from "expo-router";
import { LoadingState } from "@/components/ui";
import { useRequireRole } from "@/hooks/use-require-role";

export default function LegacyRiderRedirect() {
  const access = useRequireRole(["rider"]);
  if (access.loading) return <LoadingState fullScreen message="Opening your delivery workspace..." />;
  if (!access.allowed) return null;
  return <Redirect href="/(portal-rider)" />;
}
