import {
  evaluateAdminAccess,
  evaluateSuperAdminAccess,
  evaluateDevToolsAccess,
} from '@/lib/auth-rules'

describe('evaluateAdminAccess', () => {
  it('denies unauthenticated users', () => {
    expect(evaluateAdminAccess({ authenticated: false, role: 'admin', isAllowlistedEmail: false }))
      .toEqual({ allowed: false, error: 'Not authenticated' })
  })

  it('allows admin and super_admin roles', () => {
    expect(evaluateAdminAccess({ authenticated: true, role: 'admin', isAllowlistedEmail: false }).allowed).toBe(true)
    expect(evaluateAdminAccess({ authenticated: true, role: 'super_admin', isAllowlistedEmail: false }).allowed).toBe(true)
  })

  it('allows allow-listed emails even without an admin role', () => {
    expect(evaluateAdminAccess({ authenticated: true, role: 'organizer', isAllowlistedEmail: true }).allowed).toBe(true)
  })

  it('denies non-admin roles without an allow-listed email', () => {
    expect(evaluateAdminAccess({ authenticated: true, role: 'organizer', isAllowlistedEmail: false }))
      .toEqual({ allowed: false, error: 'Admin access required' })
    expect(evaluateAdminAccess({ authenticated: true, role: undefined, isAllowlistedEmail: false }).allowed).toBe(false)
  })
})

describe('evaluateSuperAdminAccess', () => {
  it('allows only super_admin', () => {
    expect(evaluateSuperAdminAccess({ authenticated: true, role: 'super_admin' }).allowed).toBe(true)
    expect(evaluateSuperAdminAccess({ authenticated: true, role: 'admin' }))
      .toEqual({ allowed: false, error: 'Super admin access required' })
  })

  it('denies unauthenticated', () => {
    expect(evaluateSuperAdminAccess({ authenticated: false, role: 'super_admin' }))
      .toEqual({ allowed: false, error: 'Not authenticated' })
  })
})

describe('evaluateDevToolsAccess', () => {
  const base = { authenticated: true, isAllowlistedEmail: false }

  it('denies unauthenticated', () => {
    expect(evaluateDevToolsAccess({ ...base, authenticated: false, role: 'super_admin', isProduction: true, enableDevToolsEnv: false }))
      .toEqual({ allowed: false, error: 'Not authenticated' })
  })

  it('denies non-admins outright', () => {
    expect(evaluateDevToolsAccess({ ...base, role: 'organizer', isProduction: false, enableDevToolsEnv: false }))
      .toEqual({ allowed: false, error: 'Admin access required' })
  })

  it('in production: super_admin allowed, regular admin denied', () => {
    expect(evaluateDevToolsAccess({ ...base, role: 'super_admin', isProduction: true, enableDevToolsEnv: false }).allowed).toBe(true)
    expect(evaluateDevToolsAccess({ ...base, role: 'admin', isProduction: true, enableDevToolsEnv: false }))
      .toEqual({ allowed: false, error: 'Developer tools are disabled in this environment' })
  })

  it('in production with ENABLE_DEV_TOOLS=true: regular admin allowed', () => {
    expect(evaluateDevToolsAccess({ ...base, role: 'admin', isProduction: true, enableDevToolsEnv: true }).allowed).toBe(true)
  })

  it('in non-production: any admin allowed', () => {
    expect(evaluateDevToolsAccess({ ...base, role: 'admin', isProduction: false, enableDevToolsEnv: false }).allowed).toBe(true)
  })
})
