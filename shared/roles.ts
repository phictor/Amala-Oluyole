export const APP_ROLES = [
  "customer",
  "finance",
  "staff",
  "kitchen",
  "rider",
  "admin",
  "manager",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  finance: "Finance",
  staff: "Operations Staff",
  kitchen: "Kitchen",
  rider: "Rider",
  admin: "Owner",
  manager: "Manager",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
