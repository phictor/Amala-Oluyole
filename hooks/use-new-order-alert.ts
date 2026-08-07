import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

const ALERT_SOUND = require('@/assets/sounds/order-alert.mp3');

/**
 * Detects newly-arrived pending orders between poll cycles and fires:
 *  - A "New Order!" audio chime (respects iOS silent mode via playsInSilentMode)
 *  - A strong haptic notification (iOS: Error pattern = three strong pulses; Android: vibration)
 *
 * @param orders   Live order array from the tRPC query
 * @param muted    When true, audio is suppressed (haptics still fire)
 */
export function useNewOrderAlert(
  orders: Array<{ id: number; status: string }>,
  muted: boolean,
) {
  // Track the set of order IDs we have already alerted on
  const seenIds = useRef<Set<number>>(new Set());
  // Flag: first mount — seed seenIds without alerting
  const initialized = useRef(false);

  const player = useAudioPlayer(ALERT_SOUND);

  // Enable playback in iOS silent mode once on mount
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      player.release();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playAlert = useCallback(() => {
    // Haptics: three strong pulses to grab attention
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    // Audio chime (unless muted)
    if (!muted) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // Silently ignore audio errors — haptic already fired
      }
    }
  }, [muted, player]);

  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');

    if (!initialized.current) {
      // First render: seed the seen set so we don't alert on existing orders
      pendingOrders.forEach(o => seenIds.current.add(o.id));
      initialized.current = true;
      return;
    }

    // Find orders that are pending and not yet seen
    const newOrders = pendingOrders.filter(o => !seenIds.current.has(o.id));

    if (newOrders.length > 0) {
      // Mark them as seen before firing to avoid double-alerts on re-renders
      newOrders.forEach(o => seenIds.current.add(o.id));
      playAlert();
    }

    // Also clean up IDs of orders that are no longer pending (accepted/cancelled/etc.)
    // so if the same order somehow re-enters pending it would alert again
    const pendingIds = new Set(pendingOrders.map(o => o.id));
    seenIds.current.forEach(id => {
      if (!pendingIds.has(id)) seenIds.current.delete(id);
    });
  }, [orders, playAlert]);
}
