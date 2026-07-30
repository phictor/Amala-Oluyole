/**
 * useRiderLocations — subscribes to the /api/riders/live SSE stream and
 * returns the latest snapshot of all rider locations in real time.
 *
 * Falls back to an empty array when the stream is unavailable (e.g. on
 * native platforms that do not support EventSource natively — in that case
 * the caller should use the tRPC polling fallback).
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

export type RiderLocationEntry = {
  rider: {
    id: number;
    userId: number;
    branchId: number | null;
    isOnline: boolean;
    isAvailable: boolean;
    vehicleType: string;
    currentLatitude: number | null;
    currentLongitude: number | null;
    lastLocationUpdate: string | null;
    totalDeliveries: number;
    isActive: boolean;
  };
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type SseMessage = {
  type: "riderLocations";
  riders: RiderLocationEntry[];
  ts: number;
};

export function useRiderLocations() {
  const [riders, setRiders] = useState<RiderLocationEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // EventSource is only available on web; native uses tRPC polling fallback
    if (Platform.OS !== "web" || typeof EventSource === "undefined") return;

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/riders/live`;

    function connect() {
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const msg: SseMessage = JSON.parse(event.data);
          if (msg.type === "riderLocations") {
            setRiders(msg.riders);
            setLastUpdate(new Date(msg.ts));
          }
        } catch { /* ignore malformed messages */ }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect after 5 s
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { riders, connected, lastUpdate };
}
