import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Use service role client because this is a public-facing endpoint (no auth cookie)
  const supabase = createServiceRoleClient()

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { agreed, signature } = body

  if (!agreed) return NextResponse.json({ error: 'You must agree to the terms' }, { status: 400 })
  if (!signature) return NextResponse.json({ error: 'Signature is required' }, { status: 400 })

  // Fetch the proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      id,
      company_id,
      title,
      proposal_number,
      status,
      line_items,
      total,
      deposit_required,
      deposit_amount,
      customers (
        id,
        full_name,
        phone
      )
    `)
    .eq('id', params.id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  if (proposal.status === 'signed') {
    return NextResponse.json({ error: 'This proposal has already been signed' }, { status: 409 })
  }

  if (proposal.status === 'declined' || proposal.status === 'expired') {
    return NextResponse.json({ error: `This proposal has been ${proposal.status}` }, { status: 409 })
  }

  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

  const now = new Date().toISOString()

  // Update proposal to signed
  const { data: updatedProposal, error: updateError } = await supabase
    .from('proposals')
    .update({
      status: 'signed',
      signed_at: now,
      signed_ip: ip,
      signature_data: signature,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error signing proposal:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Automatically create a job from the signed proposal
  const customer = proposal.customers as any
  let jobId: string | null = null

  try {
    // Check if a job already exists for this proposal
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('proposal_id', params.id)
      .maybeSingle()

    if (!existingJob) {
      const { data: newJob } = await supabase
        .from('jobs')
        .insert({
          company_id: proposal.company_id,
          customer_id: customer?.id,
          proposal_id: params.id,
          title: proposal.title,
          status: 'scheduled',
          notes: `Created from proposal ${proposal.proposal_number}`,
          total: proposal.total,
        })
        .select('id')
        .single()

      if (newJob) jobId = newJob.id
    } else {
      jobId = existingJob.id
    }
  } catch (e) {
    console.error('Failed to auto-create job from signed proposal:', e)
    // Don't fail the signing — job creation is best-effort
  }

  // Send confirmation SMS if Twilio is configured
  if (
    customer?.phone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', proposal.company_id)
      .single()

    const companyName = company?.name || 'Your service provider'
    const message = `Hi ${customer.full_name}, your proposal has been signed! ${companyName} will be in touch shortly to confirm scheduling.`

    const smsResult = await sendSMS(formatPhoneForSMS(customer.phone), message)

    if (smsResult.success) {
      try {
        await supabase.from('sms_log').insert({
          company_id: proposal.company_id,
          to_phone: customer.phone,
          message_type: 'proposal',
          message_body: message,
          twilio_sid: smsResult.sid || null,
          status: 'sent',
          related_job_id: null,
        })
      } catch { /* non-critical */ }
    }
  }

  return NextResponse.json({ success: true, jobId })
}
