import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'

type RouteContext = { params: { id: string } }

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch the invoice with customer and company data
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      total,
      amount_due,
      due_date,
      customers (
        full_name,
        phone,
        email
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Don't re-send a paid or void invoice
  if (invoice.status === 'paid' || invoice.status === 'void') {
    return NextResponse.json(
      { error: `Cannot send an invoice with status "${invoice.status}".` },
      { status: 409 }
    )
  }

  // Fetch company name for SMS
  const { data: company } = await supabase
    .from('companies')
    .select('name, phone')
    .eq('id', userData.company_id)
    .single()

  // Build the public invoice URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
  const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`

  // No Stripe — payment link is a placeholder
  // Update invoice: status -> 'sent', sent_at -> now
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      // payment_link_url intentionally left as-is (no Stripe)
    })
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating invoice status:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send SMS to customer if phone is available and Twilio is configured
  const customer = invoice.customers as any
  const smsResult = { attempted: false, success: false, error: '' }

  const twilioConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER

  if (customer?.phone && twilioConfigured) {
    smsResult.attempted = true
    const companyName = company?.name || 'Your service provider'

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(invoice.amount_due ?? invoice.total ?? 0)

    const smsBody = [
      `Hi ${customer.full_name?.split(' ')[0] || 'there'},`,
      `Your invoice ${invoice.invoice_number} for ${formattedTotal} from ${companyName} is ready.`,
      `View it here: ${invoiceUrl}`,
    ].join(' ')

    const formattedPhone = formatPhoneForSMS(customer.phone)
    const result = await sendSMS(formattedPhone, smsBody)

    smsResult.success = result.success
    if (!result.success) {
      smsResult.error = result.error || 'SMS delivery failed'
      console.warn(`SMS failed for invoice ${invoice.id}:`, result.error)
    }

    // Log the SMS attempt
    await supabase.from('sms_log').insert({
      company_id: userData.company_id,
      to_phone: formattedPhone,
      message_type: 'invoice',
      message_body: smsBody,
      twilio_sid: result.sid ?? null,
      status: result.success ? 'sent' : 'failed',
      related_job_id: null,
    } as any)
  }

  return NextResponse.json({
    invoice: updatedInvoice,
    sms: smsResult,
    invoice_url: invoiceUrl,
    payment_link: null, // Payment link will be generated here once Stripe is configured
  })
}
