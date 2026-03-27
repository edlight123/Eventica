import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function PrivacyPolicyPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">Privacy Policy</h1>
          <p className="text-[11px] sm:text-[13px] md:text-base text-gray-600 mb-4 sm:mb-6 md:mb-8">Last updated: November 23, 2025</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 prose prose-sm sm:prose prose-teal max-w-none">
          <h2>1. Information We Collect</h2>
          
          <h3>Personal Information</h3>
          <p>When you use Eventica, we may collect:</p>
          <ul>
            <li>Name and email address</li>
            <li>Phone number</li>
            <li>Payment information (processed securely by third parties)</li>
            <li>Profile information and preferences</li>
            <li>Identity verification documents (for event organizers)</li>
          </ul>

          <h3>Usage Information</h3>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Pages visited and time spent on pages</li>
            <li>Event searches and purchases</li>
            <li>Interaction with emails and notifications</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Process ticket purchases and manage your account</li>
            <li>Send event confirmations and reminders</li>
            <li>Provide customer support</li>
            <li>Personalize your experience and recommendations</li>
            <li>Prevent fraud and ensure platform security</li>
            <li>Analyze usage patterns to improve our service</li>
            <li>Send marketing communications (with your consent)</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We may share your information with:</p>
          
          <h3>Event Organizers</h3>
          <p>
            When you purchase a ticket, we share your name, email, and phone number with the event organizer for event management purposes.
          </p>

          <h3>Service Providers</h3>
          <ul>
            <li>Payment processors (Stripe, MonCash)</li>
            <li>Email service providers (Resend)</li>
            <li>Cloud hosting providers (Firebase, Vercel)</li>
            <li>Analytics services</li>
          </ul>

          <h3>Legal Requirements</h3>
          <p>
            We may disclose information when required by law or to protect our rights, property, or safety.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul>
            <li>Encryption of sensitive data in transit and at rest</li>
            <li>Secure payment processing (PCI DSS compliant)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication</li>
            <li>Monitoring for suspicious activity</li>
          </ul>

          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your data</li>
            <li>Object to data processing</li>
          </ul>

          <h2>6. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul>
            <li>Remember your preferences and settings</li>
            <li>Maintain your login session</li>
            <li>Analyze site usage and performance</li>
            <li>Provide personalized content</li>
          </ul>
          <p>
            You can control cookie settings through your browser preferences.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your personal data for as long as necessary to provide our services and comply with legal obligations. Ticket purchase records are retained for tax and accounting purposes.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Eventica is not intended for children under 13. We do not knowingly collect personal information from children under 13.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than Haiti. We ensure appropriate safeguards are in place for such transfers.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification.
          </p>

          <h2>11. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights:
          </p>
          <ul>
            <li><strong>Email:</strong> privacy@joineventica.com</li>
            <li><strong>Data Protection Officer:</strong> dpo@joineventica.com</li>
            <li><strong>Address:</strong> Port-au-Prince, Haiti</li>
          </ul>

          <h2>13. GDPR Compliance</h2>
          <p>
            For users in the European Union, we comply with GDPR requirements:
          </p>
          <ul>
            <li>Lawful basis for processing (consent, contract, legitimate interest)</li>
            <li>Right to data portability</li>
            <li>Right to be forgotten</li>
            <li>Data breach notification</li>
            <li>Privacy by design and default</li>
          </ul>
        </div>
      </div>
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
