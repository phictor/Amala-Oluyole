/**
 * InfoRow — a labeled key-value row used in detail cards, receipts, and summary panels.
 *
 * Usage:
 *   <InfoRow label="Order #" value="ORD-0042" />
 *   <InfoRow label="Total" value="₦4,500" bold />
 *   <InfoRow label="Status" value="Delivered" valueColor="#22C55E" />
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface InfoRowProps {
  label: string;
  value: string | number;
  bold?: boolean;
  valueColor?: string;
  style?: object;
}

export function InfoRow({ label, value, bold, valueColor = "#201060", style }: InfoRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  label: {
    fontSize: 13,
    color: "#6B6490",
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: "#201060",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  bold: {
    fontSize: 15,
    fontWeight: "800",
  },
});
