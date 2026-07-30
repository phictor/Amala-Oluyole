/**
 * ActionButton — a consistent primary/secondary/danger button used across all screens.
 *
 * Usage:
 *   <ActionButton label="Confirm Order" onPress={handleConfirm} />
 *   <ActionButton label="Cancel" variant="secondary" onPress={handleCancel} />
 *   <ActionButton label="Delete" variant="danger" onPress={handleDelete} />
 *   <ActionButton label="Loading..." loading />
 */
import React from "react";
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, View,
} from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ActionButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: object;
  textStyle?: object;
}

const BG: Record<Variant, string> = {
  primary: "#D02010",
  secondary: "#F3F4F6",
  danger: "#FEE2E2",
  ghost: "transparent",
};
const FG: Record<Variant, string> = {
  primary: "#FFF",
  secondary: "#201060",
  danger: "#D02010",
  ghost: "#201060",
};

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ActionButtonProps) {
  const bg = BG[variant];
  const fg = FG[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bg },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon !== undefined && <Text style={[styles.icon, { color: fg }]}>{icon}</Text>}
          <Text style={[styles.label, { color: fg }, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: { fontSize: 16 },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: { opacity: 0.5 },
});
