#!/usr/bin/env node

/**
 * i18n Key Parity Checker
 * Verifies that all translation keys are present across all language files
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const LANGUAGES = ['en', 'fr', 'ht'];

// Derive namespaces dynamically from the reference locale (en) so every namespace file is
// checked automatically — no need to keep this list in sync by hand when files are added.
const NAMESPACES = fs
  .readdirSync(path.join(LOCALES_DIR, 'en'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.basename(file, '.json'))
  .sort();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadTranslationFile(lang, namespace) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}Error loading ${lang}/${namespace}.json:${colors.reset}`, error.message);
    return null;
  }
}

function checkNamespace(namespace) {
  console.log(`\n${colors.cyan}Checking namespace: ${namespace}${colors.reset}`);
  
  const translations = {};
  const keys = {};
  
  // Load all translations for this namespace
  for (const lang of LANGUAGES) {
    translations[lang] = loadTranslationFile(lang, namespace);
    if (translations[lang]) {
      keys[lang] = getAllKeys(translations[lang]);
    } else {
      keys[lang] = [];
    }
  }
  
  // Use English as reference
  const referenceKeys = keys['en'];
  const issues = [];
  
  // Check for missing keys in other languages
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    
    const missing = referenceKeys.filter(key => !keys[lang].includes(key));
    const extra = keys[lang].filter(key => !referenceKeys.includes(key));
    
    if (missing.length > 0) {
      issues.push({
        type: 'missing',
        lang,
        keys: missing
      });
    }
    
    if (extra.length > 0) {
      issues.push({
        type: 'extra',
        lang,
        keys: extra
      });
    }
  }
  
  // Report issues
  if (issues.length === 0) {
    console.log(`  ${colors.green}✓ All keys match across languages${colors.reset}`);
    return true;
  } else {
    for (const issue of issues) {
      if (issue.type === 'missing') {
        console.log(`  ${colors.red}✗ Missing keys in ${issue.lang}:${colors.reset}`);
        issue.keys.forEach(key => console.log(`    - ${key}`));
      } else {
        console.log(`  ${colors.yellow}⚠ Extra keys in ${issue.lang}:${colors.reset}`);
        issue.keys.forEach(key => console.log(`    - ${key}`));
      }
    }
    return false;
  }
}

function main() {
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  i18n Translation Key Parity Checker${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  
  let allPassed = true;
  
  for (const namespace of NAMESPACES) {
    const passed = checkNamespace(namespace);
    if (!passed) allPassed = false;
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.green}✓ All translation files are in sync!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Translation files have inconsistencies${colors.reset}`);
    process.exit(1);
  }
}

main();
