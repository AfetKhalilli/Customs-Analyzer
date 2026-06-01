import type { Role } from '../types';
import { useRole } from '../store/authStore';

// ── Portal routing ────────────────────────────────────────────────────────
// The app is split into two route groups:
//   • User Portal  → /portal/*  (role: 'user' — individual & company declarants)
//   • Staff Portal → /admin/*   (roles: 'inspector' | 'departmentHead' | 'boss' | 'pca')
//
// Pages and stores keep using *portal-relative* resource paths (e.g.
// '/declarations', '/declaration/123', '/pca/company/123'). The portal prefix
// is resolved from the current user's role at navigation/render time. This is
// why stored notification links in the data store / seed stay unchanged — they
// hold the resource path and are prefixed when clicked.

export const STAFF_ROLES: Role[] = ['inspector', 'departmentHead', 'boss', 'pca'];

/** Which portal a role lives in. Declarants → /portal, all staff → /admin. */
export function portalBase(role: Role | null | undefined): '/portal' | '/admin' {
  return role === 'user' ? '/portal' : '/admin';
}

/**
 * Build an absolute in-app path for a role from a portal-relative resource
 * path. Query strings are preserved.
 *   appPath('user', '/declarations')      → '/portal/declarations'
 *   appPath('boss', '/pca/company/123')   → '/admin/pca/company/123'
 *   appPath('boss', '/staff')             → '/admin/staff'
 */
export function appPath(role: Role | null | undefined, resource: string): string {
  const res = resource.startsWith('/') ? resource : `/${resource}`;
  return `${portalBase(role)}${res}`;
}

/**
 * Hook returning a resolver that prefixes resource paths with the current
 * user's portal base. Use in any component that navigates within the app:
 *   const pp = usePortalPath();
 *   navigate(pp('/declarations'));
 *   <Link to={pp('/declaration/new')} />
 */
export function usePortalPath(): (resource: string) => string {
  const role = useRole();
  return (resource: string) => appPath(role, resource);
}
