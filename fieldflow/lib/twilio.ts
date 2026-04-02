import twilio from 'twilio'

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  // Only initialize if we have valid credentials
  if (!sid || !token || !sid.startsWith('AC')) {
    return null
  }
  return twilio(sid, token)
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const client = getTwilioClient()
    if (!client) {
      console.warn('Twilio not configured — skipping SMS to', to)
      return { success: false, error: 'Twilio not configured' }
    }
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
    })
    return { success: true, sid: message.sid }
  } catch (error: any) {
    console.error('Twilio SMS error:', error)
    return { success: false, error: error.message }
  }
}

export function formatPhoneForSMS(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone
}
