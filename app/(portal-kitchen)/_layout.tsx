import { Stack } from 'expo-router';
import { PortalAccessGate } from '@/components/portal-access-gate';

export default function KitchenPortalLayout() {
  return (
    <PortalAccessGate portal="kitchen">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalAccessGate>
  );
}
