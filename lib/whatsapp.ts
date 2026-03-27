/**
 * WhatsApp Notification Service
 * 
 * Sends WhatsApp messages via Twilio API for:
 * - Ticket confirmations
 * - Event reminders
 * - Event updates
 * 
 * Requires environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER (e.g., whatsapp:+14155238886)
 */

interface WhatsAppMessage {
  to: string // Phone number in E.164 format (e.g., +50938765432)
  message: string
}

export async function sendWhatsAppMessage({ to, message }: WhatsAppMessage) {
  // Check if Twilio credentials are configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log('WhatsApp not configured, skipping notification')
    console.log('Message would be sent to:', to)
    console.log('Message content:', message)
    return { success: false, reason: 'not_configured' }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:${to}`,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send WhatsApp message')
    }

    const data = await response.json()
    console.log('WhatsApp message sent:', data.sid)
    return { success: true, messageId: data.sid }
  } catch (error: any) {
    console.error('WhatsApp error:', error)
    return { success: false, error: error.message }
  }
}

export function getTicketConfirmationWhatsApp(
  userName: string,
  eventTitle: string,
  eventDate: string,
  venue: string,
  ticketCode: string
): string {
  return `🎟️ *Ticket Confirmation - Eventica*

Hi ${userName}! 

Your ticket for *${eventTitle}* is confirmed!

📅 *Event Details:*
Date: ${eventDate}
Venue: ${venue}

🎫 *Your Ticket Code:*
${ticketCode}

Show this code or your QR code at the entrance.

See you there! 🎉

---
Eventica - Experience Haiti's Best Events`
}

export function getEventReminderWhatsApp(
  userName: string,
  eventTitle: string,
  hoursUntil: number,
  venue: string
): string {
  return `⏰ *Event Reminder - Eventica*

Hi ${userName}!

*${eventTitle}* starts in ${hoursUntil} hours!

📍 Location: ${venue}

Don't forget your ticket! Have a great time! 🎉

---
Eventica`
}

export function getEventUpdateWhatsApp(
  eventTitle: string,
  updateMessage: string
): string {
  return `📢 *Event Update - Eventica*

*${eventTitle}*

${updateMessage}

---
Eventica - Experience Haiti's Best Events`
}
