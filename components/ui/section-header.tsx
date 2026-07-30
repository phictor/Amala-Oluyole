/**
 * SectionHeader — consistent section title + optional action link used across all screens.
 *
 * Usage:
 *   <SectionHeader title="Recent Orders" actionLabel="See All" onAction={() => router.push('/orders')} />
 *   <SectionHeader title="Top Meals" />
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#201060",
  },
  action: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D02010",
  },
});
