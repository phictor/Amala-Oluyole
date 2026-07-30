/**
 * LoadingState — full-screen or inline loading indicator with optional message.
 *
 * Usage:
 *   <LoadingState message="Loading orders..." />
 *   <LoadingState fullScreen />
 */
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface LoadingStateProps {
  message?: string;
  /** When true, fills available space (flex: 1) */
  fullScreen?: boolean;
  style?: object;
}

export function LoadingState({ message, fullScreen, style }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size="large" color="#D02010" />
      {message !== undefined && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  fullScreen: { flex: 1 },
  message: {
    fontSize: 14,
    color: "#6B6490",
    textAlign: "center",
  },
});
