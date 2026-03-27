import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function RefundPolicyPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">Refund Policy</h1>
          <p className="text-[11px] sm:text-[13px] md:text-base text-gray-600 mb-4 sm:mb-6 md:mb-8">Last updated: November 23, 2025</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 prose prose-sm sm:prose prose-teal max-w-none">
          <h2>1. General Refund Policy</h2>
          <p>
            Refund policies for events are set by individual event organizers. Eventica acts as a ticketing platform and facilitates refunds according to the organizer&apos;s stated policy.
          </p>

          <h2>2. Event Cancellation by Organizer</h2>
          <p>
            If an event is cancelled by the organizer:
          </p>
          <ul>
            <li>Full refunds will be issued automatically within 5-7 business days</li>
            <li>Refunds include the ticket price but may exclude service fees</li>
            <li>You will receive an email confirmation of the refund</li>
            <li>Refunds are processed to the original payment method</li>
          </ul>

          <h2>3. Event Postponement</h2>
          <p>
            If an event is postponed to a new date:
          </p>
          <ul>
            <li>Your ticket remains valid for the new date</li>
            <li>You may request a refund if you cannot attend the new date</li>
            <li>Refund requests must be made within 7 days of the postponement announcement</li>
            <li>The organizer may offer credit for future events instead of refunds</li>
          </ul>

          <h2>4. Attendee-Requested Refunds</h2>
          <p>
            If you wish to cancel your ticket:
          </p>
          <ul>
            <li>Refund availability depends on the event organizer&apos;s policy</li>
            <li>Most events offer refunds up to 48-72 hours before the event</li>
            <li>A cancellation fee may apply (typically 10-20% of ticket price)</li>
            <li>Some events may be non-refundable - check before purchasing</li>
            <li>Refunds must be requested through your account dashboard</li>
          </ul>

          <h2>5. Service Fees</h2>
          <p>
            Eventica service fees:
          </p>
          <ul>
            <li>Are non-refundable in most cases</li>
            <li>May be refunded if the event is cancelled by the organizer</li>
            <li>Cover platform costs, payment processing, and customer support</li>
          </ul>

          <h2>6. Refund Timeline</h2>
          <ul>
            <li><strong>Approved refunds:</strong> Processed within 5-7 business days</li>
            <li><strong>Credit card refunds:</strong> May take an additional 3-5 days to appear</li>
            <li><strong>Mobile payment refunds:</strong> Typically processed within 24-48 hours</li>
            <li><strong>Bank transfers:</strong> May take up to 10 business days</li>
          </ul>

          <h2>7. Exceptions and Special Cases</h2>
          
          <h3>No Refunds For:</h3>
          <ul>
            <li>Events attended or checked in to</li>
            <li>Tickets transferred to another person</li>
            <li>Last-minute cancellations (within 24 hours of event)</li>
            <li>Weather-related issues (unless event is cancelled)</li>
            <li>Personal emergencies or schedule conflicts</li>
          </ul>

          <h3>Eligible for Refunds:</h3>
          <ul>
            <li>Duplicate ticket purchases</li>
            <li>Technical errors in booking</li>
            <li>Venue changes that are unreasonable</li>
            <li>Significant changes to event lineup or program</li>
          </ul>

          <h2>8. How to Request a Refund</h2>
          <ol>
            <li>Log in to your Eventica account</li>
            <li>Go to &quot;My Tickets&quot;</li>
            <li>Select the ticket you wish to refund</li>
            <li>Click &quot;Request Refund&quot;</li>
            <li>Provide a reason for the refund request</li>
            <li>Submit the request for review</li>
          </ol>

          <h2>9. Refund Review Process</h2>
          <p>
            Refund requests are reviewed by:
          </p>
          <ul>
            <li>Event organizers (for organizer policy-based refunds)</li>
            <li>Eventica support team (for platform issues)</li>
            <li>Review typically completed within 2-3 business days</li>
            <li>You will receive an email with the decision</li>
          </ul>

          <h2>10. Disputed Charges</h2>
          <p>
            If you believe you were charged incorrectly:
          </p>
          <ul>
            <li>Contact our support team before disputing with your bank</li>
            <li>Provide transaction details and evidence</li>
            <li>We will investigate and respond within 48 hours</li>
            <li>Chargebacks may result in account suspension</li>
          </ul>

          <h2>11. Gift Tickets and Promotional Codes</h2>
          <ul>
            <li>Tickets purchased with promotional codes follow standard refund policies</li>
            <li>Gift tickets may not be eligible for cash refunds</li>
            <li>Credit may be issued instead for promotional purchases</li>
          </ul>

          <h2>12. Contact Support</h2>
          <p>
            For refund-related questions:
          </p>
          <ul>
            <li><strong>Email:</strong> refunds@joineventica.com</li>
            <li><strong>Support:</strong> support@joineventica.com</li>
            <li><strong>Response Time:</strong> Within 24-48 hours</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mt-8">
            <h3 className="text-lg font-semibold text-blue-900 mt-0">💡 Refund Tips</h3>
            <ul className="mb-0">
              <li>Always check the event&apos;s refund policy before purchasing</li>
              <li>Consider event insurance for expensive tickets</li>
              <li>Request refunds as early as possible</li>
              <li>Keep all confirmation emails for your records</li>
              <li>Contact support if you have questions before purchasing</li>
            </ul>
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
