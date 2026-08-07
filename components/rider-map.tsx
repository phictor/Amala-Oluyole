import React from "react";
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebView from "react-native-webview";

interface RiderMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
  etaMinutes?: number;
  riderName?: string;
  height?: number;
}

/**
 * RiderMap — renders an OpenStreetMap tile map via WebView with a rider pin.
 * Works on iOS, Android, and Web. No API key required.
 */
export function RiderMap({
  riderLat,
  riderLng,
  destinationLat,
  destinationLng,
  etaMinutes,
  riderName = "Rider",
  height = 220,
}: RiderMapProps) {
  const mapHtml = useMemo(() => {
    const destMarker = destinationLat && destinationLng ? `
      var destIcon = L.divIcon({
        html: '<div style="background:#22C55E;border:3px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📍</div>',
        iconSize:[28,28],iconAnchor:[14,14],className:''
      });
      L.marker([${destinationLat},${destinationLng}],{icon:destIcon}).addTo(map).bindPopup('<b>Delivery Address</b>');
      L.polyline([[${riderLat},${riderLng}],[${destinationLat},${destinationLng}]],{color:'#D02010',weight:3,dashArray:'8 6',opacity:0.7}).addTo(map);
    ` : "";
    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-control-attribution{display:none}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${riderLat},${riderLng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var riderIcon=L.divIcon({html:'<div style="background:#D02010;border:3px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.35)">🛵</div>',iconSize:[32,32],iconAnchor:[16,16],className:''});
L.marker([${riderLat},${riderLng}],{icon:riderIcon}).addTo(map).bindPopup('<b>${riderName}</b><br>${riderLat.toFixed(5)}, ${riderLng.toFixed(5)}${etaMinutes ? `<br>ETA ~${etaMinutes} min` : ""}').openPopup();
${destMarker}
</script></body></html>`;
  }, [riderLat, riderLng, destinationLat, destinationLng, etaMinutes, riderName]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onError={() => {}}
      />
      {etaMinutes !== undefined && (
        <View style={styles.etaOverlay}>
          <Text style={styles.etaText}>🕐 ETA ~{etaMinutes} min</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E8E6F4",
  },
  webview: { flex: 1, backgroundColor: "transparent" },
  etaOverlay: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "rgba(32,16,96,0.9)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  etaText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
});
