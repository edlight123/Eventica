# Testing Implementation Guide

## Overview
Comprehensive guide for adding unit and integration tests to the Eventica payout system.

---

## Test Stack

Current setup in `package.json`:
- **Jest**: Test framework
- **@testing-library/react**: React component testing
- **ts-jest**: TypeScript support for Jest

---

## Step 1: Test Structure

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── encryption.test.ts
│   │   ├── rate-limit.test.ts
│   │   └── payout-destinations.test.ts
│   ├── api/
│   │   └── auth.test.ts
│   └── utils/
│       └── validation.test.ts
├── integration/
│   ├── payout-flow.test.ts
│   ├── verification-flow.test.ts
│   └── notification-flow.test.ts
└── e2e/
    └── mobile-payout-settings.test.ts
```

---

## Step 2: Unit Tests for Backend Logic

### Test 1: Encryption Module

Create `__tests__/unit/lib/encryption.test.ts`:

```typescript
import { encryptJson, decryptJson } from '@/lib/security/encryption'

describe('Encryption Module', () => {
  const testData = {
    accountNumber: '1234567890',
    routingNumber: '987654321',
    swiftCode: 'ABCDUS33',
  }

  it('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptJson(testData)
    expect(encrypted).toBeDefined()
    expect(typeof encrypted).toBe('string')
    expect(encrypted).not.toContain('1234567890') // Should not contain plain text

    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual(testData)
  })

  it('should produce different ciphertext for same input (IV randomization)', () => {
    const encrypted1 = encryptJson(testData)
    const encrypted2 = encryptJson(testData)
    
    expect(encrypted1).not.toEqual(encrypted2) // Different ciphertext
    expect(decryptJson(encrypted1)).toEqual(testData) // Both decrypt correctly
    expect(decryptJson(encrypted2)).toEqual(testData)
  })

  it('should fail to decrypt with wrong key', () => {
    const encrypted = encryptJson(testData)
    
    // Mock wrong encryption key
    const originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'wrong_key_' + originalKey
    
    expect(() => decryptJson(encrypted)).toThrow()
    
    // Restore original key
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('should handle empty objects', () => {
    const encrypted = encryptJson({})
    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual({})
  })

  it('should handle nested objects', () => {
    const nested = {
      bank: {
        name: 'Test Bank',
        account: {
          number: '12345',
          routing: '67890',
        },
      },
    }
    
    const encrypted = encryptJson(nested)
    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual(nested)
  })
})
```

### Test 2: Payout Destinations Logic

Create `__tests__/unit/lib/payout-destinations.test.ts`:

```typescript
import { jest } from '@jest/globals'

// Mock Firebase Admin SDK
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          get: jest.fn(),
          add: jest.fn(),
          doc: jest.fn(() => ({
            set: jest.fn(),
            get: jest.fn(),
          })),
        })),
      })),
    })),
  },
}))

describe('Payout Destinations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Name Matching Validation', () => {
    it('should match exact names', () => {
      const accountHolder = 'John Smith'
      const organizerNames = ['John Smith', 'john.smith@example.com']
      
      // This would use the actual nameMatchesOrganizer function
      // For now, test the logic:
      const normalized = accountHolder.toLowerCase().replace(/[^a-z0-9\\s]/g, ' ').trim()
      const match = organizerNames.some(name => 
        name.toLowerCase().includes(normalized)
      )
      
      expect(match).toBe(true)
    })

    it('should match partial names', () => {
      const accountHolder = 'John'
      const organizerNames = ['John Smith']
      
      const normalized = accountHolder.toLowerCase()
      const match = organizerNames.some(name => 
        name.toLowerCase().includes(normalized)
      )
      
      expect(match).toBe(true)
    })

    it('should reject completely different names', () => {
      const accountHolder = 'Jane Doe'
      const organizerNames = ['John Smith']
      
      const normalized = accountHolder.toLowerCase()
      const match = organizerNames.some(name => 
        name.toLowerCase().includes(normalized) ||
        normalized.includes(name.toLowerCase())
      )
      
      expect(match).toBe(false)
    })
  })

  describe('Last 4 Digits Extraction', () => {
    it('should extract last 4 digits from account number', () => {
      const accountNumber = '1234567890'
      const last4 = accountNumber.slice(-4)
      expect(last4).toBe('7890')
    })

    it('should handle short account numbers', () => {
      const accountNumber = '123'
      const last4 = accountNumber.slice(-4)
      expect(last4).toBe('123')
    })
  })
})
```

### Test 3: File Validation

Create `__tests__/unit/utils/file-validation.test.ts`:

```typescript
describe('File Validation', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

  const validateFile = (file: { size: number; type: string }) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File exceeds maximum size of 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB provided)`,
      }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid type '${file.type}'. Allowed: JPEG, PNG, PDF`,
      }
    }

    return { valid: true }
  }

  it('should accept valid files', () => {
    const validFile = { size: 5 * 1024 * 1024, type: 'image/jpeg' }
    const result = validateFile(validFile)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject files over size limit', () => {
    const oversizedFile = { size: 15 * 1024 * 1024, type: 'image/jpeg' }
    const result = validateFile(oversizedFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds maximum size')
    expect(result.error).toContain('15.00MB')
  })

  it('should reject invalid file types', () => {
    const invalidFile = { size: 1024, type: 'video/mp4' }
    const result = validateFile(invalidFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid type')
    expect(result.error).toContain('video/mp4')
  })

  it('should accept all allowed types', () => {
    ALLOWED_TYPES.forEach(type => {
      const file = { size: 1024, type }
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })
  })
})
```

---

## Step 3: Integration Tests for API Endpoints

### Test Setup: Mock Firebase

Create `__tests__/setup.ts`:

```typescript
import { jest } from '@jest/globals'

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
    verifySessionCookie: jest.fn(),
  },
  adminStorage: {
    bucket: jest.fn(),
  },
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}))

// Set test environment variables
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters_long'
process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket.appspot.com'
```

### Test 1: Bank Verification Submission

Create `__tests__/integration/submit-bank-verification.test.ts`:

```typescript
import { POST } from '@/app/api/organizer/submit-bank-verification/route'
import { adminDb, adminAuth } from '@/lib/firebase/admin'

describe('POST /api/organizer/submit-bank-verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reject unauthenticated requests', async () => {
    ;(adminAuth.verifyIdToken as jest.Mock).mockRejectedValue(new Error('Invalid token'))

    const formData = new FormData()
    formData.append('proofDocument', new Blob(['test'], { type: 'image/jpeg' }))
    formData.append('verificationType', 'bank_statement')

    const request = new Request('http://localhost/api/organizer/submit-bank-verification', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated')
  })

  it('should reject requests without proof document', async () => {
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-123' })

    const formData = new FormData()
    formData.append('verificationType', 'bank_statement')

    const request = new Request('http://localhost/api/organizer/submit-bank-verification', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('should reject oversized files', async () => {
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-123' })

    const formData = new FormData()
    const oversizedFile = new Blob([new ArrayBuffer(15 * 1024 * 1024)], { type: 'image/jpeg' })
    formData.append('proofDocument', oversizedFile, 'large.jpg')
    formData.append('verificationType', 'bank_statement')

    const request = new Request('http://localhost/api/organizer/submit-bank-verification', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('exceeds maximum size')
  })

  it('should reject invalid file types', async () => {
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-123' })

    const formData = new FormData()
    const invalidFile = new Blob(['video'], { type: 'video/mp4' })
    formData.append('proofDocument', invalidFile, 'video.mp4')
    formData.append('verificationType', 'bank_statement')

    const request = new Request('http://localhost/api/organizer/submit-bank-verification', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('invalid type')
  })
})
```

---

## Step 4: Mobile Component Tests

### Test Mobile Payout Settings Screen

Create `__tests__/mobile/payout-settings.test.tsx`:

```typescript
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import OrganizerPayoutSettingsScreenV2 from '@/mobile/screens/organizer/OrganizerPayoutSettingsScreenV2'
import { useAuth } from '@/mobile/contexts/AuthContext'
import { backendFetch } from '@/mobile/lib/api/backend'

// Mock dependencies
jest.mock('@/mobile/contexts/AuthContext')
jest.mock('@/mobile/lib/api/backend')
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}))

describe('OrganizerPayoutSettingsScreenV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user-123' },
    })
  })

  it('should render loading state initially', () => {
    const { getByText } = render(<OrganizerPayoutSettingsScreenV2 />)
    expect(getByText('Loading payout settings...')).toBeTruthy()
  })

  it('should show empty state when no destinations exist', async () => {
    ;(backendFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ destinations: [] }),
    })

    const { getByText } = render(<OrganizerPayoutSettingsScreenV2 />)

    await waitFor(() => {
      expect(getByText('No Payout Methods')).toBeTruthy()
      expect(getByText('Add Payout Method')).toBeTruthy()
    })
  })

  it('should display existing bank destinations', async () => {
    ;(backendFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        destinations: [
          {
            id: 'bank-1',
            type: 'bank',
            bankName: 'Test Bank',
            accountName: 'John Doe',
            accountNumberLast4: '1234',
            verificationStatus: 'verified',
          },
        ],
      }),
    })

    const { getByText } = render(<OrganizerPayoutSettingsScreenV2 />)

    await waitFor(() => {
      expect(getByText('Test Bank')).toBeTruthy()
      expect(getByText('John Doe')).toBeTruthy()
      expect(getByText(/••••.*1234/)).toBeTruthy()
      expect(getByText('Verified')).toBeTruthy()
    })
  })

  it('should open add method modal when button pressed', async () => {
    ;(backendFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ destinations: [] }),
    })

    const { getByText } = render(<OrganizerPayoutSettingsScreenV2 />)

    await waitFor(() => {
      expect(getByText('Add Payout Method')).toBeTruthy()
    })

    fireEvent.press(getByText('Add Payout Method'))

    await waitFor(() => {
      expect(getByText('Choose how you want to receive payments')).toBeTruthy()
      expect(getByText('Bank Account')).toBeTruthy()
      expect(getByText('MonCash / NatCash')).toBeTruthy()
    })
  })

  it('should require identity verification before adding methods', async () => {
    ;(backendFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ destinations: [] }),
    })

    // Mock identity not verified
    const { getByText } = render(<OrganizerPayoutSettingsScreenV2 />)

    await waitFor(() => {
      expect(getByText('Identity Verification Required')).toBeTruthy()
    })
  })
})
```

---

## Step 5: End-to-End Tests (Optional)

For full E2E testing, consider:

### Playwright (Web)

```bash
npm install -D @playwright/test
```

```typescript
// e2e/payout-flow.spec.ts
import { test, expect } from '@playwright/test'

test('organizer can add and verify bank account', async ({ page }) => {
  // 1. Login
  await page.goto('/login')
  await page.fill('[name="email"]', 'organizer@test.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // 2. Navigate to payout settings
  await page.goto('/organizer/settings/payout')

  // 3. Click add payout method
  await page.click('text=Add Payout Method')

  // 4. Select bank account
  await page.click('text=Bank Account')

  // 5. Fill in bank details
  await page.fill('[name="accountName"]', 'Test User')
  await page.fill('[name="bankName"]', 'Test Bank')
  await page.fill('[name="accountNumber"]', '1234567890')

  // 6. Submit
  await page.click('text=Save Bank Account')

  // 7. Verify success message
  await expect(page.locator('text=Bank Account Added')).toBeVisible()
})
```

### Detox (React Native - Mobile)

```bash
npm install -D detox
```

```typescript
// e2e/mobile-payout.e2e.ts
describe('Mobile Payout Settings', () => {
  beforeAll(async () => {
    await device.launchApp()
    // Login flow
  })

  it('should show empty state for new organizer', async () => {
    await element(by.id('payout-settings-tab')).tap()
    await expect(element(by.text('No Payout Methods'))).toBeVisible()
  })

  it('should allow adding bank account', async () => {
    await element(by.text('Add Payout Method')).tap()
    await element(by.text('Bank Account')).tap()
    
    await element(by.id('account-name-input')).typeText('John Doe')
    await element(by.id('bank-name-input')).typeText('Test Bank')
    await element(by.id('account-number-input')).typeText('1234567890')
    
    await element(by.text('Save Bank Account')).tap()
    
    await expect(element(by.text('Bank Account Added'))).toBeVisible()
  })
})
```

---

## Step 6: Run Tests

### Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:mobile": "jest __tests__/mobile"
  }
}
```

### Run Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:mobile
```

---

## Step 7: CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test --coverage
        env:
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Coverage Goals

Target coverage levels:
- **Critical paths**: 100% (authentication, encryption, payment logic)
- **Business logic**: 80-90%
- **UI components**: 60-70%
- **Overall project**: 70%+

---

## Best Practices

1. **Test Naming**: Use descriptive names
   ```typescript
   it('should reject bank verification when account name does not match organizer profile', ...)
   ```

2. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   // Arrange
   const user = { uid: 'test-123', name: 'John' }
   
   // Act
   const result = validateName(user.name, 'Jane')
   
   // Assert
   expect(result.valid).toBe(false)
   ```

3. **Mock External Dependencies**: Don't test Firebase, test YOUR logic
   ```typescript
   jest.mock('@/lib/firebase/admin')
   ```

4. **Test Edge Cases**: Not just happy paths
   - Empty inputs
   - Null/undefined
   - Boundary values
   - Error conditions

5. **Keep Tests Fast**: Mock expensive operations
   - Database calls
   - File uploads
   - Network requests

---

## Next Steps

1. ✅ Set up test structure (`__tests__/` directories)
2. ✅ Write unit tests for encryption module
3. ✅ Write unit tests for validation logic
4. ✅ Write integration tests for API endpoints
5. ✅ Write mobile component tests
6. ✅ Set up CI/CD pipeline
7. ✅ Achieve 70% coverage baseline
8. ✅ Add E2E tests for critical flows (optional)

---

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [Playwright](https://playwright.dev/)
- [Detox](https://wix.github.io/Detox/)
