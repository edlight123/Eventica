import fs from 'node:fs'
import path from 'node:path'

/**
 * en, fr and ht must define exactly the same keys.
 *
 * A missing key does not throw — i18next falls back to the key name or to
 * English — so an untranslated string ships silently and is only discovered by a
 * user who cannot read it. This is the cheapest place to catch that, and it
 * matters most while a large extraction pass is in flight: hundreds of keys are
 * being added, and every one has to land in all three files.
 */
const ROOT = path.join(process.cwd(), 'public/locales')
const LANGS = ['en', 'fr', 'ht'] as const

function flatten(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k))
    }
  } else {
    out[prefix] = String(value)
  }
  return out
}

const namespaces = fs
  .readdirSync(path.join(ROOT, 'en'))
  .filter((f) => f.endsWith('.json'))

const load = (lang: string, ns: string) =>
  flatten(JSON.parse(fs.readFileSync(path.join(ROOT, lang, ns), 'utf8')))

describe('locale parity', () => {
  it('ships the same namespaces in every language', () => {
    for (const lang of LANGS) {
      expect(fs.readdirSync(path.join(ROOT, lang)).filter((f) => f.endsWith('.json')).sort())
        .toEqual(namespaces.slice().sort())
    }
  })

  describe.each(namespaces)('%s', (ns) => {
    const en = load('en', ns)

    it.each(['fr', 'ht'])('%s defines every English key', (lang) => {
      const other = load(lang, ns)
      const missing = Object.keys(en).filter((k) => !(k in other))
      expect(missing).toEqual([])
    })

    it.each(['fr', 'ht'])('%s defines no keys English lacks', (lang) => {
      const other = load(lang, ns)
      const extra = Object.keys(other).filter((k) => !(k in en))
      expect(extra).toEqual([])
    })

    it.each(LANGS)('%s leaves no value empty', (lang) => {
      const values = load(lang, ns)
      const blank = Object.entries(values)
        .filter(([, v]) => v.trim() === '')
        .map(([k]) => k)
      expect(blank).toEqual([])
    })
  })
})
