import { Stack } from 'expo-router';
import { PortalAccessGate } from '@/components/portal-access-gate';

export default function AdminPortalLayout() {
  return (
    <PortalAccessGate portal="admin">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalAccessGate>
  );
}
