/**
 * EmptyState — zero-data placeholder shown when a list or query returns nothing.
 *
 * Usage:
 *   <EmptyState emoji="📭" title="No orders yet" subtitle="Orders will appear here." />
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  style?: object;
}

export function EmptyState({ emoji = "📭", title, subtitle, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#201060",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B6490",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 19,
  },
});
