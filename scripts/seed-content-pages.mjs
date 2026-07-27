/**
 * Seed script: transcribes the hardcoded legal/help pages into Firestore at
 * content_pages/{slug} so that web + mobile can render a single source of truth.
 *
 * Run with: node scripts/seed-content-pages.mjs
 * Requires:  FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON service account key).
 *
 * This is idempotent: each doc is fully replaced via .set().
 */

import admin from 'firebase-admin'

// Best-effort: load .env.local so the script is runnable without exporting vars.
try {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
} catch {
  // dotenv not installed — rely on the ambient environment instead.
}

// Initialize Firebase Admin. Parse the service-account JSON resiliently: when
// the key is loaded from .env.local its private_key contains real newlines,
// which break a naive JSON.parse — so on failure we escape the control chars,
// then restore \n in the private_key for the cert (mirrors upload-guides.mjs).
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY (set it in .env.local).')
    process.exit(1)
  }
  let serviceAccount
  try {
    serviceAccount = JSON.parse(raw)
  } catch {
    serviceAccount = JSON.parse(raw.replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t'))
  }
  if (typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

/**
 * @typedef {Object} Page
 * @property {string} slug
 * @property {string} title
 * @property {string} updated
 * @property {Array<Object>} blocks
 */

/** @type {Page[]} */
const pages = [
  // ---------------------------------------------------------------------------
  // TERMS OF SERVICE  (app/legal/terms/page.tsx)
  // ---------------------------------------------------------------------------
  {
    slug: 'terms',
    title: 'Terms of Service',
    updated: 'November 23, 2025',
    blocks: [
      { type: 'heading', level: 2, text: '1. Acceptance of Terms' },
      {
        type: 'paragraph',
        text: 'By accessing and using Tikèm ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.',
      },
      { type: 'heading', level: 2, text: '2. Use License' },
      {
        type: 'paragraph',
        text: 'Permission is granted to temporarily use the Platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.',
      },
      { type: 'heading', level: 3, text: 'Under this license you may not:' },
      {
        type: 'list',
        items: [
          'Modify or copy the materials',
          'Use the materials for any commercial purpose or for any public display',
          'Attempt to decompile or reverse engineer any software contained on the Platform',
          'Remove any copyright or other proprietary notations from the materials',
          'Transfer the materials to another person or "mirror" the materials on any other server',
        ],
      },
      { type: 'heading', level: 2, text: '3. Event Organizers' },
      { type: 'paragraph', text: 'Event organizers using the Platform agree to:' },
      {
        type: 'list',
        items: [
          'Provide accurate and truthful information about their events',
          'Honor all ticket sales and refunds according to stated policies',
          'Comply with all applicable laws and regulations',
          'Not engage in fraudulent or deceptive practices',
          'Maintain appropriate insurance for their events',
        ],
      },
      { type: 'heading', level: 2, text: '4. Ticket Purchases' },
      { type: 'paragraph', text: 'When purchasing tickets through the Platform:' },
      {
        type: 'list',
        items: [
          'All sales are subject to availability',
          'Tickets are non-transferable unless otherwise stated',
          'Refund policies are set by individual event organizers',
          'You are responsible for checking event details before purchase',
          'Tikèm acts as an intermediary and is not liable for event cancellations or changes',
        ],
      },
      { type: 'heading', level: 2, text: '5. User Content' },
      {
        type: 'paragraph',
        text: 'Users may post reviews, comments, and other content. By posting content, you grant Tikèm a non-exclusive, royalty-free, perpetual license to use, reproduce, modify, and display such content.',
      },
      { type: 'heading', level: 2, text: '6. Prohibited Activities' },
      { type: 'paragraph', text: 'You agree not to:' },
      {
        type: 'list',
        items: [
          'Violate any laws or regulations',
          'Infringe on intellectual property rights',
          'Transmit viruses or malicious code',
          'Engage in fraudulent ticket sales or purchases',
          'Harass or harm other users',
          'Use automated systems to access the Platform',
        ],
      },
      { type: 'heading', level: 2, text: '7. Payment Processing' },
      {
        type: 'paragraph',
        text: 'Payments are processed securely through third-party payment processors. Tikèm does not store credit card information. A service fee may be applied to ticket purchases.',
      },
      { type: 'heading', level: 2, text: '8. Limitation of Liability' },
      {
        type: 'paragraph',
        text: 'Tikèm shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform or any events listed on it.',
      },
      { type: 'heading', level: 2, text: '9. Account Termination' },
      {
        type: 'paragraph',
        text: 'We reserve the right to terminate or suspend accounts that violate these terms or engage in prohibited activities, without prior notice.',
      },
      { type: 'heading', level: 2, text: '10. Modifications to Terms' },
      {
        type: 'paragraph',
        text: 'Tikèm reserves the right to revise these terms at any time. Continued use of the Platform after changes constitutes acceptance of modified terms.',
      },
      { type: 'heading', level: 2, text: '11. Governing Law' },
      {
        type: 'paragraph',
        text: 'These terms shall be governed by and construed in accordance with the laws of Haiti, without regard to its conflict of law provisions.',
      },
      { type: 'heading', level: 2, text: '12. Contact Information' },
      {
        type: 'paragraph',
        text: 'For questions about these Terms of Service, please contact us at:',
      },
      { type: 'paragraph', text: 'Email: legal@tikem.co' },
      { type: 'paragraph', text: 'Address: Port-au-Prince, Haiti' },
    ],
  },

  // ---------------------------------------------------------------------------
  // PRIVACY POLICY  (app/legal/privacy/page.tsx)
  // ---------------------------------------------------------------------------
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: 'November 23, 2025',
    blocks: [
      { type: 'heading', level: 2, text: '1. Information We Collect' },
      { type: 'heading', level: 3, text: 'Personal Information' },
      { type: 'paragraph', text: 'When you use Tikèm, we may collect:' },
      {
        type: 'list',
        items: [
          'Name and email address',
          'Phone number',
          'Payment information (processed securely by third parties)',
          'Profile information and preferences',
          'Identity verification documents (for event organizers)',
        ],
      },
      { type: 'heading', level: 3, text: 'Usage Information' },
      {
        type: 'list',
        items: [
          'IP address and device information',
          'Browser type and version',
          'Pages visited and time spent on pages',
          'Event searches and purchases',
          'Interaction with emails and notifications',
        ],
      },
      { type: 'heading', level: 2, text: '2. How We Use Your Information' },
      { type: 'paragraph', text: 'We use collected information to:' },
      {
        type: 'list',
        items: [
          'Process ticket purchases and manage your account',
          'Send event confirmations and reminders',
          'Provide customer support',
          'Personalize your experience and recommendations',
          'Prevent fraud and ensure platform security',
          'Analyze usage patterns to improve our service',
          'Send marketing communications (with your consent)',
        ],
      },
      { type: 'heading', level: 2, text: '3. Information Sharing' },
      { type: 'paragraph', text: 'We may share your information with:' },
      { type: 'heading', level: 3, text: 'Event Organizers' },
      {
        type: 'paragraph',
        text: 'When you purchase a ticket, we share your name, email, and phone number with the event organizer for event management purposes.',
      },
      { type: 'heading', level: 3, text: 'Service Providers' },
      {
        type: 'list',
        items: [
          'Payment processors (Stripe, MonCash)',
          'Email service providers (Resend)',
          'Cloud hosting providers (Firebase, Vercel)',
          'Analytics services',
        ],
      },
      { type: 'heading', level: 3, text: 'Legal Requirements' },
      {
        type: 'paragraph',
        text: 'We may disclose information when required by law or to protect our rights, property, or safety.',
      },
      { type: 'heading', level: 2, text: '4. Data Security' },
      {
        type: 'paragraph',
        text: 'We implement industry-standard security measures to protect your data:',
      },
      {
        type: 'list',
        items: [
          'Encryption of sensitive data in transit and at rest',
          'Secure payment processing (PCI DSS compliant)',
          'Regular security audits and updates',
          'Access controls and authentication',
          'Monitoring for suspicious activity',
        ],
      },
      { type: 'heading', level: 2, text: '5. Your Rights' },
      { type: 'paragraph', text: 'You have the right to:' },
      {
        type: 'list',
        items: [
          'Access your personal data',
          'Correct inaccurate information',
          'Request deletion of your data',
          'Opt-out of marketing communications',
          'Export your data',
          'Object to data processing',
        ],
      },
      { type: 'heading', level: 2, text: '6. Cookies and Tracking' },
      { type: 'paragraph', text: 'We use cookies and similar technologies to:' },
      {
        type: 'list',
        items: [
          'Remember your preferences and settings',
          'Maintain your login session',
          'Analyze site usage and performance',
          'Provide personalized content',
        ],
      },
      {
        type: 'paragraph',
        text: 'You can control cookie settings through your browser preferences.',
      },
      { type: 'heading', level: 2, text: '7. Data Retention' },
      {
        type: 'paragraph',
        text: 'We retain your personal data for as long as necessary to provide our services and comply with legal obligations. Ticket purchase records are retained for tax and accounting purposes.',
      },
      { type: 'heading', level: 2, text: "8. Children's Privacy" },
      {
        type: 'paragraph',
        text: 'Tikèm is not intended for children under 13. We do not knowingly collect personal information from children under 13.',
      },
      { type: 'heading', level: 2, text: '9. International Data Transfers' },
      {
        type: 'paragraph',
        text: 'Your information may be transferred to and processed in countries other than Haiti. We ensure appropriate safeguards are in place for such transfers.',
      },
      { type: 'heading', level: 2, text: '10. Changes to This Policy' },
      {
        type: 'paragraph',
        text: 'We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification.',
      },
      { type: 'heading', level: 2, text: '11. Third-Party Links' },
      {
        type: 'paragraph',
        text: 'Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites.',
      },
      { type: 'heading', level: 2, text: '12. Contact Us' },
      {
        type: 'paragraph',
        text: 'For privacy-related questions or to exercise your rights:',
      },
      {
        type: 'list',
        items: [
          'Email: privacy@tikem.co',
          'Data Protection Officer: dpo@tikem.co',
          'Address: Port-au-Prince, Haiti',
        ],
      },
      { type: 'heading', level: 2, text: '13. GDPR Compliance' },
      {
        type: 'paragraph',
        text: 'For users in the European Union, we comply with GDPR requirements:',
      },
      {
        type: 'list',
        items: [
          'Lawful basis for processing (consent, contract, legitimate interest)',
          'Right to data portability',
          'Right to be forgotten',
          'Data breach notification',
          'Privacy by design and default',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // REFUND POLICY  (app/legal/refunds/page.tsx)
  // ---------------------------------------------------------------------------
  {
    slug: 'refunds',
    title: 'Refund Policy',
    updated: 'November 23, 2025',
    blocks: [
      { type: 'heading', level: 2, text: '1. General Refund Policy' },
      {
        type: 'paragraph',
        text: "Refund policies for events are set by individual event organizers. Tikèm acts as a ticketing platform and facilitates refunds according to the organizer's stated policy.",
      },
      { type: 'heading', level: 2, text: '2. Event Cancellation by Organizer' },
      { type: 'paragraph', text: 'If an event is cancelled by the organizer:' },
      {
        type: 'list',
        items: [
          'Full refunds will be issued automatically within 5-7 business days',
          'Refunds include the ticket price but may exclude service fees',
          'You will receive an email confirmation of the refund',
          'Refunds are processed to the original payment method',
        ],
      },
      { type: 'heading', level: 2, text: '3. Event Postponement' },
      { type: 'paragraph', text: 'If an event is postponed to a new date:' },
      {
        type: 'list',
        items: [
          'Your ticket remains valid for the new date',
          'You may request a refund if you cannot attend the new date',
          'Refund requests must be made within 7 days of the postponement announcement',
          'The organizer may offer credit for future events instead of refunds',
        ],
      },
      { type: 'heading', level: 2, text: '4. Attendee-Requested Refunds' },
      { type: 'paragraph', text: 'If you wish to cancel your ticket:' },
      {
        type: 'list',
        items: [
          "Refund availability depends on the event organizer's policy",
          'Most events offer refunds up to 48-72 hours before the event',
          'A cancellation fee may apply (typically 10-20% of ticket price)',
          'Some events may be non-refundable - check before purchasing',
          'Refunds must be requested through your account dashboard',
        ],
      },
      { type: 'heading', level: 2, text: '5. Service Fees' },
      { type: 'paragraph', text: 'Tikèm service fees:' },
      {
        type: 'list',
        items: [
          'Are non-refundable in most cases',
          'May be refunded if the event is cancelled by the organizer',
          'Cover platform costs, payment processing, and customer support',
        ],
      },
      { type: 'heading', level: 2, text: '6. Refund Timeline' },
      {
        type: 'list',
        items: [
          'Approved refunds: Processed within 5-7 business days',
          'Credit card refunds: May take an additional 3-5 days to appear',
          'Mobile payment refunds: Typically processed within 24-48 hours',
          'Bank transfers: May take up to 10 business days',
        ],
      },
      { type: 'heading', level: 2, text: '7. Exceptions and Special Cases' },
      { type: 'heading', level: 3, text: 'No Refunds For:' },
      {
        type: 'list',
        items: [
          'Events attended or checked in to',
          'Tickets transferred to another person',
          'Last-minute cancellations (within 24 hours of event)',
          'Weather-related issues (unless event is cancelled)',
          'Personal emergencies or schedule conflicts',
        ],
      },
      { type: 'heading', level: 3, text: 'Eligible for Refunds:' },
      {
        type: 'list',
        items: [
          'Duplicate ticket purchases',
          'Technical errors in booking',
          'Venue changes that are unreasonable',
          'Significant changes to event lineup or program',
        ],
      },
      { type: 'heading', level: 2, text: '8. How to Request a Refund' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Log in to your Tikèm account',
          'Go to "My Tickets"',
          'Select the ticket you wish to refund',
          'Click "Request Refund"',
          'Provide a reason for the refund request',
          'Submit the request for review',
        ],
      },
      { type: 'heading', level: 2, text: '9. Refund Review Process' },
      { type: 'paragraph', text: 'Refund requests are reviewed by:' },
      {
        type: 'list',
        items: [
          'Event organizers (for organizer policy-based refunds)',
          'Tikèm support team (for platform issues)',
          'Review typically completed within 2-3 business days',
          'You will receive an email with the decision',
        ],
      },
      { type: 'heading', level: 2, text: '10. Disputed Charges' },
      { type: 'paragraph', text: 'If you believe you were charged incorrectly:' },
      {
        type: 'list',
        items: [
          'Contact our support team before disputing with your bank',
          'Provide transaction details and evidence',
          'We will investigate and respond within 48 hours',
          'Chargebacks may result in account suspension',
        ],
      },
      { type: 'heading', level: 2, text: '11. Gift Tickets and Promotional Codes' },
      {
        type: 'list',
        items: [
          'Tickets purchased with promotional codes follow standard refund policies',
          'Gift tickets may not be eligible for cash refunds',
          'Credit may be issued instead for promotional purchases',
        ],
      },
      { type: 'heading', level: 2, text: '12. Contact Support' },
      { type: 'paragraph', text: 'For refund-related questions:' },
      {
        type: 'list',
        items: [
          'Email: refunds@tikem.co',
          'Support: support@tikem.co',
          'Response Time: Within 24-48 hours',
        ],
      },
      {
        type: 'callout',
        title: '💡 Refund Tips',
        items: [
          "Always check the event's refund policy before purchasing",
          'Consider event insurance for expensive tickets',
          'Request refunds as early as possible',
          'Keep all confirmation emails for your records',
          'Contact support if you have questions before purchasing',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SUPPORT / HELP CENTER  (app/support/page.tsx + SupportContent.tsx + en/support.json)
  // Interactive widgets (search, role toggle, request form) are skipped; the
  // readable FAQ content and contact options are captured as blocks.
  // ---------------------------------------------------------------------------
  {
    slug: 'support',
    title: 'How can we help you?',
    updated: '',
    blocks: [
      {
        type: 'paragraph',
        text: 'Find answers to common questions or contact our support team.',
      },

      // ----- Attendee FAQs -----
      { type: 'heading', level: 2, text: 'Attendee — Tickets & Orders' },
      { type: 'paragraph', text: 'Purchase tickets, view orders, and manage your bookings.' },
      { type: 'heading', level: 3, text: 'How do I purchase tickets?' },
      {
        type: 'paragraph',
        text: 'Browse events on the homepage or Discover page, open an event, select your ticket type and quantity, then click "Get Tickets". You’ll complete a secure checkout where you can pay by card or MonCash.',
      },
      { type: 'heading', level: 3, text: 'Where can I find my tickets?' },
      {
        type: 'paragraph',
        text: 'After purchase, your tickets are available in the Tickets section of your account ("My Tickets"). Each ticket includes a unique QR code for entry.',
      },
      { type: 'heading', level: 3, text: 'Can I transfer my ticket to someone else?' },
      {
        type: 'paragraph',
        text: 'Yes. Open your ticket details and click "Transfer Ticket". Enter the recipient’s email and they’ll receive instructions to claim the ticket. Transfers must be accepted before the event starts.',
      },
      { type: 'heading', level: 3, text: 'What happens if I lose my ticket?' },
      {
        type: 'paragraph',
        text: 'Your tickets stay in your Tikèm account. Log in and go to "My Tickets" to view and download them again. You can also check your email confirmation.',
      },
      { type: 'heading', level: 3, text: 'Can I buy tickets without creating an account?' },
      {
        type: 'paragraph',
        text: 'You need an Tikèm account to purchase tickets. This keeps tickets secure and lets you manage transfers, refunds, and support requests. Creating an account only takes a minute.',
      },

      { type: 'heading', level: 2, text: 'Attendee — Event Access' },
      { type: 'paragraph', text: 'Check-in, entry requirements, and event attendance.' },
      { type: 'heading', level: 3, text: 'How do I get into an event?' },
      {
        type: 'paragraph',
        text: 'Present your ticket QR code at the entrance. Staff will scan it using Tikèm tools. Keep your phone charged and have your ticket ready in the app or email.',
      },
      { type: 'heading', level: 3, text: 'Can I enter with a screenshot of my ticket?' },
      {
        type: 'paragraph',
        text: 'A screenshot may work, but we recommend using the original ticket from your account or email. Some events may require the in-app QR code for security.',
      },
      { type: 'heading', level: 3, text: 'What if my QR code won’t scan?' },
      {
        type: 'paragraph',
        text: 'Increase screen brightness, make sure the QR code is clear, and hold your phone steady. If needed, show the confirmation email or ticket ID so staff can verify manually.',
      },
      { type: 'heading', level: 3, text: 'Can I arrive late to an event?' },
      {
        type: 'paragraph',
        text: 'Policies vary by event. Check the event details or contact the organizer. Most events allow late entry, but some experiences may have strict start times.',
      },
      { type: 'heading', level: 3, text: 'Do I need to bring ID to the event?' },
      {
        type: 'paragraph',
        text: 'ID requirements depend on the event. Age-restricted events (18+, 21+) usually require government-issued photo ID. Check the event page for details.',
      },

      { type: 'heading', level: 2, text: 'Attendee — Payments & Refunds' },
      { type: 'paragraph', text: 'Payment methods, pricing, and refund policies.' },
      { type: 'heading', level: 3, text: 'What payment methods do you accept?' },
      {
        type: 'paragraph',
        text: 'We accept Visa, Mastercard, American Express, and MonCash (for users in Haiti). Payments are processed securely through our partners.',
      },
      { type: 'heading', level: 3, text: 'Why was I charged a service fee?' },
      {
        type: 'paragraph',
        text: 'Service fees help operate the platform, provide support, and cover secure payment processing. Fees are shown clearly during checkout before you pay.',
      },
      { type: 'heading', level: 3, text: 'How do I get a refund?' },
      {
        type: 'paragraph',
        text: 'Refund policies are set by each organizer. To request a refund, open your ticket details and select "Request Refund" (if available), or contact the organizer. Approved refunds typically take 5–10 business days.',
      },
      { type: 'heading', level: 3, text: 'Can I get a refund if the event is cancelled?' },
      {
        type: 'paragraph',
        text: 'Yes. If an event is cancelled, you’re generally eligible for a refund to the original payment method. Processing typically takes 5–10 business days.',
      },
      { type: 'heading', level: 3, text: 'What currency are prices shown in?' },
      {
        type: 'paragraph',
        text: 'Prices are shown in the currency selected by the organizer (commonly HTG or USD). The currency is displayed on the event page and during checkout.',
      },

      { type: 'heading', level: 2, text: 'Attendee — Account & Profile' },
      { type: 'paragraph', text: 'Manage your account settings and preferences.' },
      { type: 'heading', level: 3, text: 'How do I create an account?' },
      {
        type: 'paragraph',
        text: 'Click "Sign Up", enter your email and password, then verify your email. You can also sign up with Google for faster access.',
      },
      { type: 'heading', level: 3, text: 'I forgot my password — what should I do?' },
      {
        type: 'paragraph',
        text: 'On the login screen, choose "Forgot Password" and enter your email. We’ll send a reset link. Check spam/junk folders if you don’t see it.',
      },
      { type: 'heading', level: 3, text: 'How do I update my profile information?' },
      {
        type: 'paragraph',
        text: 'Open your profile and edit your details. You can update your name, email, phone number, photo, and location preferences.',
      },
      { type: 'heading', level: 3, text: 'Can I delete my account?' },
      {
        type: 'paragraph',
        text: 'Yes. Go to Settings > Privacy & Security > Delete Account. This is permanent and removes your data and order history. Download any upcoming tickets first.',
      },
      { type: 'heading', level: 3, text: 'How do I change my notification preferences?' },
      {
        type: 'paragraph',
        text: 'Go to Settings > Notifications to manage email and push preferences for reminders, confirmations, and updates.',
      },

      // ----- Organizer FAQs -----
      { type: 'heading', level: 2, text: 'Organizer — Create & Manage Events' },
      { type: 'paragraph', text: 'Create events, manage listings, and publish to attendees.' },
      { type: 'heading', level: 3, text: 'How do I create an event?' },
      {
        type: 'paragraph',
        text: 'From your organizer dashboard, click "Create Event". Add details (title, description, date/time, location), upload a banner, set ticket types and pricing, then preview and publish.',
      },
      { type: 'heading', level: 3, text: 'Can I edit my event after publishing?' },
      {
        type: 'paragraph',
        text: 'Yes. You can edit most details from the organizer dashboard and changes show on the event page. Some changes (like pricing) may impact existing ticket holders.',
      },
      { type: 'heading', level: 3, text: 'How do I make my event private or invite-only?' },
      {
        type: 'paragraph',
        text: 'Use Visibility settings like "Unlisted" (access by link) and promo codes to limit sales to specific people.',
      },
      { type: 'heading', level: 3, text: 'What image sizes work best for event banners?' },
      {
        type: 'paragraph',
        text: 'We recommend 1920×1080 (16:9). Keep images under 5MB. JPG and PNG are supported.',
      },
      { type: 'heading', level: 3, text: 'Can I create recurring events?' },
      {
        type: 'paragraph',
        text: 'Yes. Choose "Recurring Event" and select a schedule (daily/weekly/monthly). Each occurrence is created automatically and can be edited if needed.',
      },
      { type: 'heading', level: 3, text: 'How do I cancel or postpone an event?' },
      {
        type: 'paragraph',
        text: 'Open the event in your dashboard and choose cancel or edit the date. Ticket holders are notified. For cancellations, you may need to process refunds depending on your policy.',
      },

      { type: 'heading', level: 2, text: 'Organizer — Payments & Payouts' },
      { type: 'paragraph', text: 'Understand fees, receive payouts, and manage finances.' },
      { type: 'heading', level: 3, text: 'How do I get paid for ticket sales?' },
      {
        type: 'paragraph',
        text: 'Payouts are deposited to your verified payout method. After your event ends, you can request a payout from your organizer dashboard.',
      },
      { type: 'heading', level: 3, text: 'What fees does Tikèm charge?' },
      {
        type: 'paragraph',
        text: 'Fees depend on payment method and configuration. You’ll always see a transparent breakdown in your dashboard and during setup.',
      },
      { type: 'heading', level: 3, text: 'When can I request a payout?' },
      {
        type: 'paragraph',
        text: 'You can request a payout after the event ends (and any applicable holding period). This helps protect against fraud and allows time for refunds/chargebacks.',
      },
      { type: 'heading', level: 3, text: 'How do I verify my bank account for payouts?' },
      {
        type: 'paragraph',
        text: 'Go to Settings > Payouts and submit your payout details and required documents. Our team reviews and verifies before payouts are enabled.',
      },
      { type: 'heading', level: 3, text: 'What happens to fees if I issue a refund?' },
      {
        type: 'paragraph',
        text: 'Refund handling depends on the payment provider. Some processing fees may be non-refundable. Your dashboard shows the exact breakdown per transaction.',
      },
      { type: 'heading', level: 3, text: 'Can I see a breakdown of my earnings?' },
      {
        type: 'paragraph',
        text: 'Yes. Your organizer dashboard includes analytics for sales, fees, net revenue, and payout status. You can also export reports.',
      },

      { type: 'heading', level: 2, text: 'Organizer — Tickets & Check-in' },
      { type: 'paragraph', text: 'Ticket types, pricing, and managing event entry.' },
      { type: 'heading', level: 3, text: 'How do I scan tickets at my event?' },
      {
        type: 'paragraph',
        text: 'Use the organizer tools to open your event and start Scan/Check-in mode. Scan attendee QR codes to validate and check them in.',
      },
      { type: 'heading', level: 3, text: 'Can I have multiple ticket types?' },
      {
        type: 'paragraph',
        text: 'Yes. Create multiple tiers (General, VIP, Early Bird, Group, etc.) with their own price, quantity, and sales dates.',
      },
      { type: 'heading', level: 3, text: 'How do I create free tickets?' },
      {
        type: 'paragraph',
        text: 'Set a ticket price to 0 to create free tickets. They still generate valid QR codes and help track attendance.',
      },
      { type: 'heading', level: 3, text: 'What happens if someone tries to use a ticket twice?' },
      {
        type: 'paragraph',
        text: 'The check-in system prevents duplicates. Once scanned, the ticket shows as used and repeat scans will show an "Already Used" warning.',
      },
      { type: 'heading', level: 3, text: 'Can I export my attendee list?' },
      {
        type: 'paragraph',
        text: 'Yes. Open your event dashboard, go to Attendees, and export to CSV for names, emails, ticket types, and check-in status.',
      },
      { type: 'heading', level: 3, text: 'How do group discounts work?' },
      {
        type: 'paragraph',
        text: 'Create a group discount by setting a minimum quantity and a discount percentage. The discount applies automatically at checkout when the minimum is met.',
      },

      { type: 'heading', level: 2, text: 'Organizer — Organizer Account & Team' },
      { type: 'paragraph', text: 'Account verification, team management, and settings.' },
      { type: 'heading', level: 3, text: 'How do I become a verified organizer?' },
      {
        type: 'paragraph',
        text: 'Go to Settings > Verification and submit your identity documents and a selfie. Verification review time can vary depending on volume and completeness.',
      },
      { type: 'heading', level: 3, text: 'Can I add team members to help manage my events?' },
      {
        type: 'paragraph',
        text: 'Yes. Go to Settings > Team to invite teammates by email and assign roles (Admin/Manager/Scanner).',
      },
      { type: 'heading', level: 3, text: 'How do I add my organization’s logo and branding?' },
      {
        type: 'paragraph',
        text: 'Go to Settings > Organization to upload a logo, set your organization name, and add a bio.',
      },
      { type: 'heading', level: 3, text: 'What are the requirements to start selling tickets?' },
      {
        type: 'paragraph',
        text: 'Requirements depend on the event type and payout method. In general, you’ll need an organizer account and may need verification and payout setup to sell paid tickets.',
      },
      { type: 'heading', level: 3, text: 'How do I contact attendees?' },
      {
        type: 'paragraph',
        text: 'From your event dashboard, use attendee messaging tools to send updates to ticket holders.',
      },
      { type: 'heading', level: 3, text: 'Can I see analytics for my events?' },
      {
        type: 'paragraph',
        text: 'Yes. Your dashboard shows sales and revenue analytics, ticket breakdowns, and other insights to help you improve future events.',
      },

      // ----- Still need help -----
      { type: 'heading', level: 2, text: 'Still need help?' },
      {
        type: 'paragraph',
        text: "Can't find what you're looking for? We're here to help.",
      },
      {
        type: 'list',
        items: [
          'Email Support: support@tikem.co — Get a response within 24 hours',
          'WhatsApp: https://wa.me/50938675309 — Chat with us directly',
          'Submit a Request: /support/request — Detailed support form',
        ],
      },
    ],
  },
]

async function seed() {
  console.log('🌱 Seeding content_pages...\n')

  for (const page of pages) {
    await db.collection('content_pages').doc(page.slug).set(page)
    console.log(`✅ ${page.slug} — ${page.blocks.length} blocks`)
  }

  console.log('\n✅ Seed complete')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
