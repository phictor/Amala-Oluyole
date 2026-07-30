/**
 * BadgeChip — a small colored pill/badge used for status labels, tags, and counts.
 *
 * Usage:
 *   <BadgeChip label="Preparing" color="#F59E0B" />
 *   <BadgeChip label="Paid" color="#22C55E" textColor="#FFF" />
 *   <BadgeChip label="Popular" color="#D02010" size="sm" />
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface BadgeChipProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: "sm" | "md";
  style?: object;
}

export function BadgeChip({
  label,
  color = "#201060",
  textColor = "#FFF",
  size = "md",
  style,
}: BadgeChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: color }, size === "sm" && styles.chipSm, style]}>
      <Text style={[styles.text, { color: textColor }, size === "sm" && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  chipSm: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
  textSm: {
    fontSize: 10,
  },
});
