import { Stack } from 'expo-router';
import { PortalAccessGate } from '@/components/portal-access-gate';

export default function RiderPortalLayout() {
  return (
    <PortalAccessGate portal="rider">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalAccessGate>
  );
}
