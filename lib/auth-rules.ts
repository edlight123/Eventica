/**
 * Pure authorization decision helpers (no Firebase / cookies / env access).
 *
 * The async `require*` gates in `lib/auth.ts` resolve the current user and the
 * environment, then delegate the actual allow/deny decision to these functions.
 * Keeping the decision pure makes the admin/security rules unit-testable.
 */

export interface AccessDecision {
  allowed: boolean
  error: string | null
}

const ALLOW: AccessDecision = { allowed: true, error: null }

function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

/** Baseline admin gate: admin/super_admin role, or an allow-listed email. */
export function evaluateAdminAccess(input: {
  authenticated: boolean
  role?: string | null
  isAllowlistedEmail: boolean
}): AccessDecision {
  if (!input.authenticated) return { allowed: false, error: 'Not authenticated' }
  if (!isAdminRole(input.role) && !input.isAllowlistedEmail) {
    return { allowed: false, error: 'Admin access required' }
  }
  return ALLOW
}

/** Strict gate: only the `super_admin` role. */
export function evaluateSuperAdminAccess(input: {
  authenticated: boolean
  role?: string | null
}): AccessDecision {
  if (!input.authenticated) return { allowed: false, error: 'Not authenticated' }
  if (input.role !== 'super_admin') return { allowed: false, error: 'Super admin access required' }
  return ALLOW
}

/**
 * Developer/debug/seed/migration tools gate.
 * - Requires an admin baseline.
 * - In production: `super_admin` only (unless explicitly enabled by env).
 * - In non-production (or when dev tools are env-enabled): any admin.
 */
export function evaluateDevToolsAccess(input: {
  authenticated: boolean
  role?: string | null
  isAllowlistedEmail: boolean
  isProduction: boolean
  enableDevToolsEnv: boolean
}): AccessDecision {
  if (!input.authenticated) return { allowed: false, error: 'Not authenticated' }
  if (!isAdminRole(input.role) && !input.isAllowlistedEmail) {
    return { allowed: false, error: 'Admin access required' }
  }
  const isSuper = input.role === 'super_admin'
  const enabled = input.enableDevToolsEnv || !input.isProduction
  if (!isSuper && !enabled) {
    return { allowed: false, error: 'Developer tools are disabled in this environment' }
  }
  return ALLOW
}
