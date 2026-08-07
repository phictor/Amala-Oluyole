/**
 * Admin Rider Tracking Screen
 *
 * Shows all active riders on a map with real-time location updates via SSE (web) / 5s polling (native).
 * Features:
 *   - All online riders displayed as markers on the map (native) or list (web)
 *   - Rider status badges (online/offline, available/busy)
 *   - Last location update timestamp
 *   - Tap a rider to see their details
 *   - Real-time push via SSE (web) / 5s tRPC polling (native fallback)
 */
import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Platform, FlatList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { SectionHeader, EmptyState, LoadingState, BadgeChip, StatCard } from "@/components/ui";
import { RiderMap } from "@/components/rider-map";
import { trpc } from "@/lib/trpc";
import { useRiderLocations } from "@/hooks/use-rider-locations";
import { useRequireRole } from "@/hooks/use-require-role";

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "Never";
  const diff = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function RiderTracking() {
  const { allowed, loading: roleLoading } = useRequireRole(["admin", "manager"]);
  if (roleLoading) return <LoadingState fullScreen message="Checking access..." />;
  if (!allowed) return null;
  return <RiderTrackingContent />;
}

function RiderTrackingContent() {
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);


  // SSE real-time stream (web only)
  const { riders: sseRiders, connected: sseConnected, lastUpdate: sseLastUpdate } = useRiderLocations();

  // tRPC polling fallback for native (5 s) and web safety net (30 s)
  const { data: trpcRiders = [], isLoading, refetch } = trpc.admin.riders.useQuery(
    undefined,
    { refetchInterval: Platform.OS === "web" ? 30_000 : 5_000 },
  );

  // Prefer SSE data on web when connected, otherwise use tRPC data
  const riderList = Platform.OS === "web" && sseConnected && sseRiders.length > 0
    ? sseRiders
    : trpcRiders;

  const lastUpdate = sseLastUpdate ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
  const onlineRiders = riderList.filter(r => r.rider.isOnline);
  const offlineRiders = riderList.filter(r => !r.rider.isOnline);
  const selectedEntry = riderList.find(r => r.rider.id === selectedRiderId);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rider Tracking</Text>
        <View style={s.liveIndicator}>
          <View style={[s.liveDot, { backgroundColor: sseConnected ? "#22C55E" : "#F59E0B" }]} />
          <Text style={[s.liveText, { color: sseConnected ? "#22C55E" : "#F59E0B" }]}>
            {sseConnected ? "Live" : "Polling"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState fullScreen message="Loading riders..." />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <View style={s.statsRow}>
            <StatCard icon="🟢" label="Online" value={onlineRiders.length} color="#22C55E" />
            <StatCard icon="⚫" label="Offline" value={offlineRiders.length} color="#6B6490" />
            <StatCard icon="🛵" label="Total" value={riderList.length} color="#201060" />
          </View>

          {/* Selected Rider Map */}
          {selectedEntry && selectedEntry.rider.currentLatitude && selectedEntry.rider.currentLongitude ? (
            <>
              <SectionHeader
                title={`Tracking: ${selectedEntry.user?.name ?? "Rider"}`}
                actionLabel="Clear"
                onAction={() => setSelectedRiderId(null)}
                style={s.sectionHeader}
              />
              <RiderMap
                riderLat={selectedEntry.rider.currentLatitude}
                riderLng={selectedEntry.rider.currentLongitude}
                riderName={selectedEntry.user?.name ?? "Rider"}
                height={240}
              />
              <Text style={s.lastUpdate}>
                Last update: {fmtTime(selectedEntry.rider.lastLocationUpdate)}
              </Text>
            </>
          ) : selectedEntry ? (
            <View style={s.noLocationCard}>
              <Text style={s.noLocationText}>
                📍 {selectedEntry.user?.name ?? "Rider"} has not shared a location yet.
              </Text>
              <TouchableOpacity onPress={() => setSelectedRiderId(null)} activeOpacity={0.7}>
                <Text style={s.clearText}>Clear selection</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Online Riders */}
          <SectionHeader
            title={`Online Riders (${onlineRiders.length})`}
            style={s.sectionHeader}
          />
          {onlineRiders.length === 0 ? (
            <EmptyState emoji="😴" title="No riders online" subtitle="Riders will appear here when they go online." />
          ) : (
            onlineRiders.map(entry => (
              <TouchableOpacity
                key={entry.rider.id}
                style={[s.riderCard, selectedRiderId === entry.rider.id && s.riderCardSelected]}
                onPress={() => setSelectedRiderId(
                  selectedRiderId === entry.rider.id ? null : entry.rider.id
                )}
                activeOpacity={0.8}
              >
                <View style={s.riderCardTop}>
                  <View style={[s.statusDot, { backgroundColor: "#22C55E" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.riderName}>{entry.user?.name ?? "Unknown Rider"}</Text>
                    <Text style={s.riderMeta}>
                      {entry.rider.vehicleType} · {(entry.rider as any).vehiclePlate ?? "No plate"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <BadgeChip
                      label={entry.rider.isAvailable ? "Available" : "Busy"}
                      color={entry.rider.isAvailable ? "#22C55E" : "#F59E0B"}
                      size="sm"
                    />
                    <Text style={s.riderDeliveries}>{entry.rider.totalDeliveries} deliveries</Text>
                  </View>
                </View>
                {entry.rider.currentLatitude && entry.rider.currentLongitude ? (
                  <Text style={s.riderLocation}>
                    📍 {entry.rider.currentLatitude.toFixed(4)}, {entry.rider.currentLongitude.toFixed(4)}
                    {" · "}{fmtTime(entry.rider.lastLocationUpdate)}
                  </Text>
                ) : (
                  <Text style={s.riderLocation}>📍 Location not available</Text>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Offline Riders */}
          {offlineRiders.length > 0 && (
            <>
              <SectionHeader
                title={`Offline Riders (${offlineRiders.length})`}
                style={[s.sectionHeader, { marginTop: 20 }]}
              />
              {offlineRiders.map(entry => (
                <View key={entry.rider.id} style={[s.riderCard, s.riderCardOffline]}>
                  <View style={s.riderCardTop}>
                    <View style={[s.statusDot, { backgroundColor: "#9B94C4" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.riderName, { color: "#6B6490" }]}>{entry.user?.name ?? "Unknown Rider"}</Text>
                      <Text style={s.riderMeta}>
                        {entry.rider.vehicleType} · {(entry.rider as any).vehiclePlate ?? "No plate"}
                      </Text>
                    </View>
                    <Text style={s.riderDeliveries}>{entry.rider.totalDeliveries} deliveries</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8D4EE",
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: "#201060", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#201060" },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  liveText: { fontSize: 12, fontWeight: "700", color: "#22C55E" },
  scroll: { padding: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  sectionHeader: { marginBottom: 12 },
  lastUpdate: { fontSize: 11, color: "#9B94C4", textAlign: "center", marginTop: 6, marginBottom: 16 },
  noLocationCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  noLocationText: { fontSize: 14, color: "#6B6490", textAlign: "center" },
  clearText: { fontSize: 13, fontWeight: "700", color: "#D02010" },
  riderCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  riderCardSelected: {
    borderColor: "#D02010",
  },
  riderCardOffline: {
    opacity: 0.65,
  },
  riderCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  riderName: { fontSize: 15, fontWeight: "800", color: "#201060" },
  riderMeta: { fontSize: 12, color: "#6B6490", marginTop: 2 },
  riderDeliveries: { fontSize: 11, color: "#9B94C4" },
  riderLocation: { fontSize: 12, color: "#6B6490", marginTop: 2 },
});

