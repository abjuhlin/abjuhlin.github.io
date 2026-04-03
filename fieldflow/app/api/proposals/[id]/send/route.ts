import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch proposal with customer and company info
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      id,
      title,
      proposal_number,
      status,
      customers (
        id,
        full_name,
        phone
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', userData.company_id)
    .single()

  // Update proposal status to 'sent' and set sent_at
  const { data: updated, error: updateError } = await supabase
    .from('proposals')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating proposal status:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send SMS if Twilio is configured
  const customer = proposal.customers as any
  let smsResult: { success: boolean; sid?: string; error?: string } = { success: false }

  if (
    customer?.phone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.fieldflow.com'}/proposal/${params.id}`
    const companyName = company?.name || 'Your service provider'
    const message = `Hi ${customer.full_name}, ${companyName} has sent you a proposal (${proposal.proposal_number}). View and sign here: ${proposalUrl}`

    smsResult = await sendSMS(formatPhoneForSMS(customer.phone), message)

    // Log SMS activity
    if (smsResult.success) {
      try {
        await supabase.from('sms_log').insert({
          company_id: userData.company_id,
          to_phone: customer.phone,
          message_type: 'proposal',
          message_body: message,
          twilio_sid: smsResult.sid || null,
          status: 'sent',
          related_job_id: null,
        })
      } catch { /* non-critical */ }
    }
  } else {
    console.warn('Twilio not configured — SMS not sent for proposal', params.id)
    smsResult = { success: false, error: 'Twilio not configured' }
  }

  return NextResponse.json({
    success: true,
    proposal: updated,
    sms: smsResult,
  })
}
