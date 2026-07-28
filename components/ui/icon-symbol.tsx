// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "fork.knife": "restaurant",
  "bag.fill": "shopping-bag",
  "list.bullet.rectangle": "receipt-long",
  "person.fill": "person",
  "magnifyingglass": "search",
  "heart.fill": "favorite",
  "bell.fill": "notifications",
  "location.fill": "location-on",
  "star.fill": "star",
  "clock.fill": "access-time",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "arrow.left": "arrow-back",
  "plus": "add",
  "minus": "remove",
  "trash.fill": "delete",
  "pencil": "edit",
  "phone.fill": "phone",
  "envelope.fill": "email",
  "questionmark.circle.fill": "help",
  "gift.fill": "card-giftcard",
  "tag.fill": "local-offer",
  "map.fill": "map",
  "calendar": "calendar-today",
  "person.2.fill": "group",
  "cart.fill": "shopping-cart",
  "creditcard.fill": "credit-card",
  "bicycle": "directions-bike",
  "building.2.fill": "business",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "arrow.clockwise": "refresh",
  "square.and.arrow.up": "share",
  "gearshape.fill": "settings",
  "shield.fill": "security",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
