export type LoginChannel = "email" | "phone";

export type PendingLogin = {
  challengeId: string;
  channel: LoginChannel;
  identifier: string;
  destinationHint: string;
  expiresInSeconds: number;
};

// The identifier is intentionally kept in memory instead of being placed in the
// route URL or persisted on the device. If the app restarts, the tester can safely
// request a fresh code from the sign-in screen.
let pendingLogin: PendingLogin | null = null;

export function setPendingLogin(value: PendingLogin): void {
  pendingLogin = value;
}

export function getPendingLogin(): PendingLogin | null {
  return pendingLogin;
}

export function clearPendingLogin(): void {
  pendingLogin = null;
}
