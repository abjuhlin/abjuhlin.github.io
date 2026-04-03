import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { CalendarGrid } from './CalendarGrid'

interface CalEvent {
  id: string
  type: 'job' | 'invoice'
  title: string
  date: string
  status: string
  href: string
  customerName?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
}

export default async function CalendarPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const companyId = userData.company_id

  // Fetch jobs with scheduled dates — look back 3 months and forward 6 months
  const rangeStart = new Date()
  rangeStart.setMonth(rangeStart.getMonth() - 3)
  const rangeEnd = new Date()
  rangeEnd.setMonth(rangeEnd.getMonth() + 6)

  const [{ data: jobs }, { data: invoices }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_number, title, status, scheduled_start, scheduled_end, customers (id, full_name)')
      .eq('company_id', companyId)
      .not('scheduled_start', 'is', null)
      .gte('scheduled_start', rangeStart.toISOString())
      .lte('scheduled_start', rangeEnd.toISOString()),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, due_date, customers (id, full_name), jobs (title)')
      .eq('company_id', companyId)
      .not('due_date', 'is', null)
      .gte('due_date', rangeStart.toISOString().slice(0, 10))
      .lte('due_date', rangeEnd.toISOString().slice(0, 10)),
  ])

  const events: CalEvent[] = []

  for (const job of jobs ?? []) {
    const customer = (job as any).customers
    events.push({
      id: job.id,
      type: 'job',
      title: job.title,
      date: (job.scheduled_start as string).slice(0, 10),
      status: job.status,
      href: `/dashboard/jobs/${job.id}`,
      customerName: customer?.full_name,
      scheduledStart: job.scheduled_start as string | null,
      scheduledEnd: (job as any).scheduled_end as string | null,
    })
  }

  for (const inv of invoices ?? []) {
    const customer = (inv as any).customers
    const job = (inv as any).jobs
    const title = job?.title ?? (inv as any).invoice_number
    events.push({
      id: inv.id,
      type: 'invoice',
      title,
      date: (inv.due_date as string),
      status: inv.status,
      href: `/dashboard/invoices/${inv.id}`,
      customerName: customer?.full_name,
    })
  }

  const now = new Date()

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Calendar
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <CalendarGrid
          events={events}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
        />
      </div>
    </div>
  )
}
