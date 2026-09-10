const POST_AUTH_RETURN_KEY = "amala:post-auth-return";

function supportsSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/** Stores a single approved standalone Kitchen Portal destination before web sign-in. */
export function setPostAuthReturn(value: string | undefined): void {
  if (!value || !supportsSessionStorage()) return;
  try {
    const destination = new URL(value);
    const allowedKitchenHost =
      destination.hostname === "kitchen.amalaoluyole.com" ||
      (destination.hostname.endsWith(".manus.computer") && destination.pathname.startsWith("/kitchen-portal"));
    if (destination.protocol === "https:" && allowedKitchenHost) {
      window.sessionStorage.setItem(POST_AUTH_RETURN_KEY, destination.toString());
    }
  } catch {
    // Ignore an invalid or unapproved return destination.
  }
}

/** Consumes the one-time standalone Kitchen Portal destination after successful sign-in. */
export function consumePostAuthReturn(): string | null {
  if (!supportsSessionStorage()) return null;
  const value = window.sessionStorage.getItem(POST_AUTH_RETURN_KEY);
  window.sessionStorage.removeItem(POST_AUTH_RETURN_KEY);
  return value;
}
