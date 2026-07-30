import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface RiderMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
  etaMinutes?: number;
  riderName?: string;
  height?: number;
}

export function RiderMap({
  riderLat,
  riderLng,
  destinationLat,
  destinationLng,
  etaMinutes,
  riderName = "Your Rider",
  height = 220,
}: RiderMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { latitude: riderLat, longitude: riderLng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    );
  }, [riderLat, riderLng]);

  const hasDestination = destinationLat !== undefined && destinationLng !== undefined;

  return (
    <View style={[styles.wrapper, { height }]}>
      {etaMinutes !== undefined && (
        <View style={styles.etaChip}>
          <Text style={styles.etaText}>🕐 ETA ~{etaMinutes} min</Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: riderLat,
          longitude: riderLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude: riderLat, longitude: riderLng }} title={riderName}>
          <View style={styles.riderMarker}>
            <Text style={styles.riderIcon}>🛵</Text>
          </View>
        </Marker>
        {hasDestination && (
          <Marker
            coordinate={{ latitude: destinationLat!, longitude: destinationLng! }}
            title="Delivery Address"
            pinColor="#D02010"
          />
        )}
        {hasDestination && (
          <Polyline
            coordinates={[
              { latitude: riderLat, longitude: riderLng },
              { latitude: destinationLat!, longitude: destinationLng! },
            ]}
            strokeColor="#D02010"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", borderRadius: 14, overflow: "hidden", position: "relative" },
  etaChip: {
    position: "absolute", top: 10, left: 10, zIndex: 10,
    backgroundColor: "#201060", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  etaText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  riderMarker: {
    backgroundColor: "#D02010", borderRadius: 22, padding: 7,
    borderWidth: 2.5, borderColor: "#FFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  riderIcon: { fontSize: 18 },
});
