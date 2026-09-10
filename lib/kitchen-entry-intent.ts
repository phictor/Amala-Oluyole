const KITCHEN_ENTRY_INTENT_KEY = "amala:kitchen-entry";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/** Records that this browser session started from the staff-only kitchen entry page. */
export function setKitchenEntryIntent(): void {
  if (canUseSessionStorage()) window.sessionStorage.setItem(KITCHEN_ENTRY_INTENT_KEY, "1");
}

/** Returns whether the next successful sign-in should open the kitchen workspace. */
export function hasKitchenEntryIntent(): boolean {
  return canUseSessionStorage() && window.sessionStorage.getItem(KITCHEN_ENTRY_INTENT_KEY) === "1";
}

/** Clears the one-time kitchen destination after routing is complete. */
export function clearKitchenEntryIntent(): void {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(KITCHEN_ENTRY_INTENT_KEY);
}
