import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { RiderMap } from '@/components/rider-map';
import { trpc } from '@/lib/trpc';

export default function RiderMapScreen() {
  const router = useRouter();
  const { data: riderData } = trpc.rider.getLocation.useQuery(undefined as never, { refetchInterval: 5000 });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>‹ Deliveries</Text></TouchableOpacity>
        <Text style={styles.title}>Map</Text>
      </View>
      <View style={styles.mapContainer}>
        <RiderMap
          riderLat={riderData?.latitude ?? 7.3775}
          riderLng={riderData?.longitude ?? 3.9470}
          riderName="You"
          height={500}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#201060', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#201060' },
  mapContainer: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
});
