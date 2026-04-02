import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()

  // Window for 24h reminder: jobs starting between 23h and 25h from now
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Window for 1h reminder: jobs starting between 50min and 70min from now
  const window1hStart = new Date(now.getTime() + 50 * 60 * 1000)
  const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000)

  // Get jobs needing 24h reminder
  const { data: jobs24h } = await supabase
    .from('jobs')
    .select(
      `id, title, scheduled_start, company_id, customers(full_name, phone), companies(name, notify_reminder_24h), users!assigned_tech_id(full_name)`
    )
    .eq('status', 'scheduled')
    .eq('reminder_24h_sent', false)
    .gte('scheduled_start', window24hStart.toISOString())
    .lte('scheduled_start', window24hEnd.toISOString())

  // Get jobs needing 1h reminder
  const { data: jobs1h } = await supabase
    .from('jobs')
    .select(
      `id, title, scheduled_start, address, company_id, customers(full_name, phone), companies(name, notify_reminder_1h), users!assigned_tech_id(full_name)`
    )
    .eq('status', 'scheduled')
    .eq('reminder_1h_sent', false)
    .gte('scheduled_start', window1hStart.toISOString())
    .lte('scheduled_start', window1hEnd.toISOString())

  let sent = 0

  // Process 24h reminders
  for (const job of jobs24h || []) {
    const company = job.companies as any
    const customer = job.customers as any
    if (!company?.notify_reminder_24h || !customer?.phone) continue

    const timeStr = job.scheduled_start
      ? format(new Date(job.scheduled_start), 'h:mm a')
      : 'the scheduled time'
    const message = `Reminder: ${company.name} is scheduled to visit tomorrow at ${timeStr} for ${job.title}. Reply STOP to opt out.`

    const { success, sid } = await sendSMS(formatPhoneForSMS(customer.phone), message)
    await supabase.from('sms_log').insert({
      company_id: job.company_id,
      to_phone: customer.phone,
      message_type: 'reminder',
      message_body: message,
      twilio_sid: sid || null,
      status: success ? 'sent' : 'failed',
      related_job_id: job.id,
    })
    await supabase.from('jobs').update({ reminder_24h_sent: true }).eq('id', job.id)
    if (success) sent++
  }

  // Process 1h reminders
  for (const job of jobs1h || []) {
    const company = job.companies as any
    const customer = job.customers as any
    const tech = job.users as any
    if (!company?.notify_reminder_1h || !customer?.phone) continue

    const message = `Your appointment with ${company.name} is in 1 hour. Tech: ${tech?.full_name || 'Your technician'}. Address: ${(job as any).address || 'see your confirmation'}.`

    const { success, sid } = await sendSMS(formatPhoneForSMS(customer.phone), message)
    await supabase.from('sms_log').insert({
      company_id: job.company_id,
      to_phone: customer.phone,
      message_type: 'reminder',
      message_body: message,
      twilio_sid: sid || null,
      status: success ? 'sent' : 'failed',
      related_job_id: job.id,
    })
    await supabase.from('jobs').update({ reminder_1h_sent: true }).eq('id', job.id)
    if (success) sent++
  }

  return NextResponse.json({
    sent,
    reminders24h: jobs24h?.length || 0,
    reminders1h: jobs1h?.length || 0,
  })
}
