import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function TermsOfServicePage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">Terms of Service</h1>
          <p className="text-[11px] sm:text-[13px] md:text-base text-gray-600 mb-4 sm:mb-6 md:mb-8">Last updated: November 23, 2025</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 prose prose-sm sm:prose prose-teal max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Eventica (&quot;the Platform&quot;), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use the Platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>

          <h3>Under this license you may not:</h3>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the Platform</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
          </ul>

          <h2>3. Event Organizers</h2>
          <p>
            Event organizers using the Platform agree to:
          </p>
          <ul>
            <li>Provide accurate and truthful information about their events</li>
            <li>Honor all ticket sales and refunds according to stated policies</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not engage in fraudulent or deceptive practices</li>
            <li>Maintain appropriate insurance for their events</li>
          </ul>

          <h2>4. Ticket Purchases</h2>
          <p>
            When purchasing tickets through the Platform:
          </p>
          <ul>
            <li>All sales are subject to availability</li>
            <li>Tickets are non-transferable unless otherwise stated</li>
            <li>Refund policies are set by individual event organizers</li>
            <li>You are responsible for checking event details before purchase</li>
            <li>Eventica acts as an intermediary and is not liable for event cancellations or changes</li>
          </ul>

          <h2>5. User Content</h2>
          <p>
            Users may post reviews, comments, and other content. By posting content, you grant Eventica a non-exclusive, royalty-free, perpetual license to use, reproduce, modify, and display such content.
          </p>

          <h2>6. Prohibited Activities</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit viruses or malicious code</li>
            <li>Engage in fraudulent ticket sales or purchases</li>
            <li>Harass or harm other users</li>
            <li>Use automated systems to access the Platform</li>
          </ul>

          <h2>7. Payment Processing</h2>
          <p>
            Payments are processed securely through third-party payment processors. Eventica does not store credit card information. A service fee may be applied to ticket purchases.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            Eventica shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform or any events listed on it.
          </p>

          <h2>9. Account Termination</h2>
          <p>
            We reserve the right to terminate or suspend accounts that violate these terms or engage in prohibited activities, without prior notice.
          </p>

          <h2>10. Modifications to Terms</h2>
          <p>
            Eventica reserves the right to revise these terms at any time. Continued use of the Platform after changes constitutes acceptance of modified terms.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of Haiti, without regard to its conflict of law provisions.
          </p>

          <h2>12. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
            <br />
            <strong>Email:</strong> legal@joineventica.com
            <br />
            <strong>Address:</strong> Port-au-Prince, Haiti
          </p>
        </div>
      </div>
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
