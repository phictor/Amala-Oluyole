import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RiderMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
  etaMinutes?: number;
  riderName?: string;
  height?: number;
}

export function RiderMap({ riderLat, riderLng, etaMinutes, riderName = "Your Rider", height = 220 }: RiderMapProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.icon}>🛵</Text>
      <Text style={styles.name}>{riderName}</Text>
      <Text style={styles.coords}>{riderLat.toFixed(5)}, {riderLng.toFixed(5)}</Text>
      {etaMinutes !== undefined && (
        <View style={styles.etaChip}>
          <Text style={styles.etaText}>🕐 ETA ~{etaMinutes} min</Text>
        </View>
      )}
      <Text style={styles.note}>Open in the mobile app for the full live map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%", borderRadius: 14, backgroundColor: "#F4F3FB",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#D8D4EE", gap: 6,
  },
  icon: { fontSize: 40 },
  name: { fontSize: 15, fontWeight: "700", color: "#201060" },
  coords: { fontSize: 12, color: "#6B6490" },
  etaChip: { backgroundColor: "#201060", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  etaText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  note: { fontSize: 11, color: "#9B94C4", textAlign: "center", paddingHorizontal: 24 },
});
