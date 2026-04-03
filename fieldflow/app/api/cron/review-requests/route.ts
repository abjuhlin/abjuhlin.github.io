import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find jobs needing review requests
  // Join with companies and customers
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      id, title, completed_at,
      customers(full_name, phone),
      companies(name, google_review_url, review_request_delay_hours, notify_review_request)
    `)
    .eq('status', 'complete')
    .eq('review_request_sent', false)
    .not('completed_at', 'is', null)

  if (error) {
    console.error('Review request cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const job of jobs || []) {
    const company = job.companies as any
    const customer = job.customers as any

    // Check conditions
    if (!company?.notify_review_request) continue
    if (!company?.google_review_url) continue
    if (!customer?.phone) continue

    // Check delay
    const delayHours = company.review_request_delay_hours || 4
    const completedAt = new Date(job.completed_at!)
    const sendAfter = new Date(completedAt.getTime() + delayHours * 60 * 60 * 1000)
    if (new Date() < sendAfter) continue

    // Send SMS
    const firstName = customer.full_name?.split(' ')[0] || 'there'
    const message = `Hi ${firstName}, thanks for choosing ${company.name}! We'd love to hear about your experience — could you leave us a quick Google review? It means a lot to us: ${company.google_review_url} — ${company.name} Team`

    const { success, sid, error: smsError } = await sendSMS(formatPhoneForSMS(customer.phone), message)

    // Get company_id for this job
    const { data: jobData } = await supabase.from('jobs').select('company_id').eq('id', job.id).single()

    // Log SMS
    await supabase.from('sms_log').insert({
      company_id: jobData?.company_id,
      to_phone: customer.phone,
      message_type: 'review_request',
      message_body: message,
      twilio_sid: sid || null,
      status: success ? 'sent' : 'failed',
      related_job_id: job.id,
    })

    if (success) {
      // Mark as sent
      await supabase
        .from('jobs')
        .update({
          review_request_sent: true,
          review_request_sent_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      sent++
    } else {
      errors.push(`Job ${job.id}: ${smsError}`)
    }
  }

  return NextResponse.json({ sent, errors, total: jobs?.length || 0 })
}
