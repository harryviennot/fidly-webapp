/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Centralized configuration for route permissions based on user roles.
 */

export type Role = "owner" | "admin" | "scanner";

/**
 * Route permissions map.
 * Key: route path (handles nested routes automatically)
 * Value: array of roles that can access the route
 */
export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/": ["owner", "admin"],
  "/customers": ["owner", "admin"],
  "/team": ["owner", "admin"],
  "/design": ["owner"],
  "/settings": ["owner"],
  "/account": ["owner", "admin"],
};

/**
 * Check if a role can access a given route.
 * Handles nested routes by matching the most specific route first.
 *
 * @param role - The user's current role
 * @param pathname - The current pathname
 * @returns Whether the role can access the route
 */
export function canAccessRoute(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  if (role === "scanner") return false; // Scanners can't access any dashboard routes

  // Find matching route (handle nested routes like /design/[id])
  const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length)[0]; // Most specific match

  if (!matchingRoute) return false;

  return ROUTE_PERMISSIONS[matchingRoute].includes(role);
}

/**
 * Get all routes accessible by a given role.
 *
 * @param role - The user's current role
 * @returns Array of accessible route paths
 */
export function getAccessibleRoutes(role: Role | null): string[] {
  if (!role) return [];
  if (role === "scanner") return [];

  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([route]) => route);
}

/**
 * Check if a nav item should be visible for a given role.
 *
 * @param role - The user's current role
 * @param href - The navigation item's href
 * @returns Whether the nav item should be visible
 */
export function canSeeNavItem(role: Role | null, href: string): boolean {
  if (!role) return false;
  if (role === "scanner") return false;

  const accessibleRoutes = getAccessibleRoutes(role);
  return accessibleRoutes.some(
    (route) => href === route || href.startsWith(route + "/")
  );
}
