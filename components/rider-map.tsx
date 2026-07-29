import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RiderMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
}

/**
 * Web stub for the rider tracking map.
 * react-native-maps is not supported on web — show a text fallback instead.
 */
export function RiderMap({ riderLat, riderLng }: RiderMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛵</Text>
      <Text style={styles.text}>Live rider tracking</Text>
      <Text style={styles.coords}>
        {riderLat.toFixed(4)}, {riderLng.toFixed(4)}
      </Text>
      <Text style={styles.note}>Open in the mobile app for the full map view</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  icon: { fontSize: 40, marginBottom: 8 },
  text: { fontSize: 16, fontWeight: "600", color: "#11181C" },
  coords: { fontSize: 12, color: "#687076", marginTop: 4 },
  note: { fontSize: 11, color: "#9BA1A6", marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
});

