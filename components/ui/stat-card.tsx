/**
 * StatCard — a reusable metric tile used across Admin, Kitchen, and Finance screens.
 *
 * Usage:
 *   <StatCard icon="💰" label="Revenue" value="₦42,000" color="#D02010" />
 *   <StatCard icon="📦" label="Orders" value={128} trend="+12%" trendUp />
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  /** Optional trend indicator, e.g. "+12%" */
  trend?: string;
  /** true = green trend, false = red trend */
  trendUp?: boolean;
  /** Accent color for the icon background circle */
  color?: string;
  /** Additional container style */
  style?: object;
}

export function StatCard({ icon, label, value, trend, trendUp, color = "#201060", style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconBubble, { backgroundColor: color + "18" }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {trend !== undefined && (
        <Text style={[styles.trend, { color: trendUp ? "#22C55E" : "#D02010" }]}>
          {trendUp ? "▲" : "▼"} {trend}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    minWidth: 90,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  icon: { fontSize: 22 },
  value: {
    fontSize: 22,
    fontWeight: "900",
    color: "#201060",
    marginBottom: 2,
    textAlign: "center",
  },
  label: {
    fontSize: 11,
    color: "#6B6490",
    fontWeight: "600",
    textAlign: "center",
  },
  trend: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
});
