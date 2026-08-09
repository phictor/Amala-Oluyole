import { useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { trpc } from "@/lib/trpc";

export function useRiderLocationBroadcast({ enabled, orderId }: { enabled: boolean; orderId?: number }) {
  const updateLocation = trpc.rider.updateLocation.useMutation();

  useEffect(() => {
    if (!enabled || !orderId || Platform.OS === "web") return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted" || cancelled) return;

      const broadcast = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (!cancelled) {
            await updateLocation.mutateAsync({ orderId, latitude: location.coords.latitude, longitude: location.coords.longitude });
          }
        } catch {
          // The visible Rider screens surface API and permission state; retry on the next interval.
        }
      };

      await broadcast();
      if (!cancelled) interval = setInterval(broadcast, 15_000);
    };

    void start();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [enabled, orderId]); // eslint-disable-line react-hooks/exhaustive-deps
}
