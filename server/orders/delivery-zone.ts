export type DeliveryZoneConfig = {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
};

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6_371;
  const latDelta = ((lat2 - lat1) * Math.PI) / 180;
  const lonDelta = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(lonDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function assessDeliveryZone(
  config: DeliveryZoneConfig,
  destination: { latitude: number; longitude: number },
): { withinZone: false; reason: string } | { withinZone: boolean; distanceKm: number; radiusKm: number } {
  if (config.latitude == null || config.longitude == null || config.radiusKm == null || config.radiusKm <= 0) {
    return { withinZone: false, reason: "Delivery zone is not configured" };
  }
  const distanceKm = haversineKm(config.latitude, config.longitude, destination.latitude, destination.longitude);
  if (!Number.isFinite(distanceKm)) return { withinZone: false, reason: "Delivery location could not be verified" };
  return {
    withinZone: distanceKm <= config.radiusKm,
    distanceKm: Math.round(distanceKm * 10) / 10,
    radiusKm: config.radiusKm,
  };
}
