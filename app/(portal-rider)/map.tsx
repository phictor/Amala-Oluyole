import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusBar } from 'expo-status-bar';
import { trpc } from '@/lib/trpc';
import { RiderMap } from '@/components/rider-map';
import { LoadingState } from '@/components/ui';
import { QueryProblem } from '@/components/roles/role-portal-ui';

export default function RiderMapScreen() {
  const profileQ = trpc.rider.profile.useQuery(undefined, { refetchInterval: 15_000 });
  const ordersQ = trpc.rider.myOrders.useQuery(undefined, { refetchInterval: 15_000 });
  const activeOrder = ordersQ.data?.find((order) => ['rider_assigned', 'out_for_delivery'].includes(order.status));
  const latitude = profileQ.data?.currentLatitude;
  const longitude = profileQ.data?.currentLongitude;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Delivery Map</Text>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {(profileQ.isLoading || ordersQ.isLoading) ? (
          <LoadingState message="Loading live delivery map..." />
        ) : (profileQ.isError || ordersQ.isError) ? (
          <QueryProblem accent="#059669" title="Map unavailable" message="Live rider or delivery information could not be loaded." onRetry={() => Promise.all([profileQ.refetch(), ordersQ.refetch()]).then(() => undefined)} />
        ) : latitude != null && longitude != null ? (
          <>
            <RiderMap riderLat={latitude} riderLng={longitude} destinationLat={activeOrder?.deliveryLatitude ?? undefined} destinationLng={activeOrder?.deliveryLongitude ?? undefined} riderName="Your current position" height={360} />
            <Text style={s.text}>{profileQ.data?.isOnline ? 'Location updates every 15 seconds while a delivery is active.' : 'Go online from Deliveries to start location updates.'}</Text>
            {activeOrder?.deliveryAddress ? <Text style={s.address}>Destination: {activeOrder.deliveryAddress}</Text> : null}
          </>
        ) : (
          <View style={s.waiting}>
            <Text style={s.icon}>🗺️</Text>
            <Text style={s.text}>Go online with an active delivery to show and broadcast your current location.</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  body: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  waiting: { alignItems: 'center' },
  icon: { fontSize: 64, marginBottom: 16 },
  text: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  address: { backgroundColor: '#ECFDF5', borderRadius: 12, color: '#166534', fontSize: 13, marginTop: 12, padding: 12 },
});
