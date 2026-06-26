import { test, expect } from '@playwright/test'
import { organizerRoutes, resolvePath, VIEWPORTS, type Viewport } from './organizer-routes.manifest'

/**
 * Organizer portal route-coverage smoke test.
 *
 * Setup (run in Codespace/local against the Firebase EMULATOR — never prod):
 *   1. npm i -D @playwright/test && npx playwright install --with-deps
 *   2. Provide an authenticated storage state for the test organizer:
 *        STORAGE_STATE=tests/.auth/organizer.json  (created by a global-setup
 *        that signs in via the emulator and saves context.storageState).
 *   3. E2E_EVENT_ID=<seeded draft event id owned by the test organizer>
 *   4. BASE_URL=http://localhost:3000  npx playwright test tests/organizer
 *
 * Assertions per route × viewport: renders, a heading/landmark exists, no
 * uncaught page error, and no unexpected horizontal overflow. A screenshot is
 * saved to artifacts/organizer-portal/<viewport>/.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const EVENT_ID = process.env.E2E_EVENT_ID || ''

test.use({ storageState: process.env.STORAGE_STATE || 'tests/.auth/organizer.json' })

for (const route of organizerRoutes) {
  if (route.dynamic && !EVENT_ID) {
    test.skip(`${route.name} (skipped: set E2E_EVENT_ID)`, () => {})
    continue
  }

  const url = BASE_URL + resolvePath(route.path)

  for (const vp of route.viewports ?? (['desktop'] as Viewport[])) {
    test(`${route.name} @ ${vp}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.setViewportSize(VIEWPORTS[vp])
      const res = await page.goto(url, { waitUntil: 'networkidle' })
      expect(res?.status(), `HTTP status for ${url}`).toBeLessThan(400)

      // A primary heading or main landmark must exist.
      const hasLandmark =
        (await page.locator('h1, [role="heading"][aria-level="1"], main h2').count()) > 0
      expect(hasLandmark, `heading/landmark on ${route.path}`).toBeTruthy()

      // No unexpected horizontal overflow.
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement || document.documentElement
        return el.scrollWidth - el.clientWidth
      })
      expect(overflow, `horizontal overflow on ${route.path} @ ${vp}`).toBeLessThanOrEqual(2)

      expect(errors, `console pageerrors on ${route.path}`).toEqual([])

      await page.screenshot({
        path: `artifacts/organizer-portal/${vp}/${route.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
        fullPage: true,
      })
    })
  }
}
