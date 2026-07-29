import React from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

interface RiderMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
}

export function RiderMap({ riderLat, riderLng, destinationLat, destinationLng }: RiderMapProps) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: riderLat,
        longitude: riderLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      region={{
        latitude: riderLat,
        longitude: riderLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
    >
      <Marker
        coordinate={{ latitude: riderLat, longitude: riderLng }}
        title="Your Rider"
      >
        <View style={styles.riderMarker}>
          <Text style={styles.riderMarkerIcon}>🛵</Text>
        </View>
      </Marker>
      {destinationLat !== undefined && destinationLng !== undefined && (
        <Marker
          coordinate={{ latitude: destinationLat, longitude: destinationLng }}
          title="Delivery Address"
          pinColor="#D02010"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 220, borderRadius: 12 },
  riderMarker: {
    backgroundColor: "#D02010",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  riderMarkerIcon: { fontSize: 18 },
});
