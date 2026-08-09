import { isAppRole, type AppRole } from "../../shared/roles";

export type RoleHomeRoute =
  | "/(tabs)/home"
  | "/(portal-finance)"
  | "/(portal-staff)"
  | "/(portal-kitchen)"
  | "/(portal-rider)"
  | "/auth/login";

const CUSTOMER_ONLY_ROUTE = /^\/(checkout|addresses|loyalty|reservation|catering|favourites|order(?:\/|$)|meal(?:\/|$)|bistro(?:\/|$)|events(?:\/|$)|promotions(?:\/|$))/;

export function isCustomerOnlyRoute(pathname: string): boolean {
  return CUSTOMER_ONLY_ROUTE.test(pathname);
}

/**
 * Returns the only permitted landing workspace for a server-confirmed role.
 * Unknown roles fail closed by returning to sign in.
 */
export function routeForRole(role: string | null | undefined): RoleHomeRoute {
  if (!isAppRole(role)) return "/auth/login";

  switch (role) {
    case "finance":
      return "/(portal-finance)";
    case "staff":
    case "manager":
    case "admin":
      return "/(portal-staff)";
    case "kitchen":
      return "/(portal-kitchen)";
    case "rider":
      return "/(portal-rider)";
    case "customer":
      return "/(tabs)/home";
  }
}

export function isStaffRole(role: string | null | undefined): role is Exclude<AppRole, "customer"> {
  return isAppRole(role) && role !== "customer";
}
