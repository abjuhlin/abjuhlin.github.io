import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime, resolveJobStatus } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CreateInvoiceButton } from './_components/CreateInvoiceButton'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.65-4.65 1.358-1.358a3.75 3.75 0 0 0-5.303-5.303L9.42 5.25" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, full_name, role')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const firstName = userData?.full_name?.split(' ')[0] ?? 'there'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // ── Parallel data fetching ──────────────────────────────────────────────────
  const [
    revenueResult,
    outstandingResult,
    overdueResult,
    todayJobsResult,
    completeJobsResult,
    recentInvoicesResult,
    completedCountResult,
  ] = await Promise.all([
    // 1. Revenue this month (paid invoices)
    supabase
      .from('invoices')
      .select('total')
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .gte('paid_at', monthStart),

    // 2. Outstanding balance (sent + overdue)
    supabase
      .from('invoices')
      .select('amount_due')
      .eq('company_id', companyId)
      .in('status', ['sent', 'overdue']),

    // 3. Overdue invoices — count + sum
    supabase
      .from('invoices')
      .select('amount_due')
      .eq('company_id', companyId)
      .eq('status', 'overdue'),

    // 4. Today's active jobs
    supabase
      .from('jobs')
      .select('id, title, status, scheduled_start, customers(full_name, phone), users!assigned_tech_id(full_name)')
      .eq('company_id', companyId)
      .or(
        `and(scheduled_start.gte.${todayStart},scheduled_start.lt.${todayEnd}),status.in.(en_route,in_progress)`
      )
      .order('scheduled_start'),

    // 5a. Jobs with status 'complete' (for invoice check)
    supabase
      .from('jobs')
      .select('id, job_number, title, completed_at, customers(full_name)')
      .eq('company_id', companyId)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(10),

    // 6. Recent invoices
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, amount_due, customers(full_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5),

    // 7. Jobs completed this month
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['complete', 'invoiced', 'paid'])
      .gte('completed_at', monthStart),
  ])

  // ── Derived values ──────────────────────────────────────────────────────────
  const revenueThisMonth = (revenueResult.data ?? []).reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0
  )
  const outstandingBalance = (outstandingResult.data ?? []).reduce(
    (sum, inv) => sum + (inv.amount_due ?? 0),
    0
  )
  const overdueInvoices = overdueResult.data ?? []
  const overdueCount = overdueInvoices.length
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0)

  const todayJobs = todayJobsResult.data ?? []
  const completeJobs = completeJobsResult.data ?? []
  const completedThisMonth = completedCountResult.count ?? 0

  // 5b. Filter complete jobs that have no invoice yet
  const { data: existingInvoices } = completeJobs.length > 0
    ? await supabase
        .from('invoices')
        .select('job_id')
        .eq('company_id', companyId)
        .in('job_id', completeJobs.map((j) => j.id))
    : { data: [] }

  const invoicedJobIds = new Set((existingInvoices ?? []).map((i: any) => i.job_id))
  const jobsNeedingInvoice = completeJobs.filter((j) => !invoicedJobIds.has(j.id))

  const recentInvoices = recentInvoicesResult.data ?? []

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900 leading-tight"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Good morning, {firstName}. Here&apos;s where things stand.
          </p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon />
          New Job
        </Link>
      </div>

      {/* Revenue strip — 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1 — Revenue this month */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(revenueThisMonth)}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">Revenue this month</div>
        </div>

        {/* Card 2 — Outstanding balance */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(outstandingBalance)}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">In unpaid invoices</div>
        </div>

        {/* Card 3 — Overdue */}
        <Link href="/dashboard/invoices?status=overdue" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
          {overdueCount > 0 ? (
            <>
              <div className="text-2xl font-bold text-red-600 tabular-nums">
                {formatCurrency(overdueAmount)}
              </div>
              <div className="text-sm text-red-500 mt-0.5">
                {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">All caught up</div>
              <div className="text-sm text-gray-500 mt-0.5">No overdue invoices</div>
            </>
          )}
        </Link>

        {/* Card 4 — Jobs done this month */}
        <Link href="/dashboard/jobs?status=complete" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{completedThisMonth}</div>
          <div className="text-sm text-gray-500 mt-0.5">Jobs done this month</div>
        </Link>
      </div>

      {/* Main content — 5-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left column — 3/5 */}
        <div className="lg:col-span-3 space-y-5">

          {/* Today's Jobs */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Today&apos;s Jobs</h2>
              <Link href="/dashboard/jobs" className="text-sm text-brand hover:underline font-medium">
                View all
              </Link>
            </div>

            {todayJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
                </svg>
                <p className="text-sm text-gray-500">No jobs scheduled today</p>
                <Link
                  href="/dashboard/jobs/new"
                  className="mt-1 text-sm font-medium text-brand hover:underline"
                >
                  Schedule a job →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayJobs.map((job: any) => {
                  const resolvedStatus = resolveJobStatus(job.status, job.scheduled_start)
                  const customer = job.customers as any
                  const tech = job.users as any
                  return (
                    <Link
                      key={job.id}
                      href={`/dashboard/jobs/${job.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="shrink-0">
                        <StatusBadge status={resolvedStatus} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {customer?.full_name ?? '—'}
                        </div>
                        <div className="text-gray-500 text-sm truncate">{job.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          {job.scheduled_start && (
                            <span>{formatDateTime(job.scheduled_start)}</span>
                          )}
                          {tech?.full_name && (
                            <>
                              <span>·</span>
                              <span>{tech.full_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Jobs Awaiting Invoice */}
          {jobsNeedingInvoice.length > 0 && (
            <div className="card border-l-4 border-l-amber-400">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Needs Invoice ({jobsNeedingInvoice.length})
                  </h2>
                </div>
                <Link href="/dashboard/jobs?status=complete" className="text-sm text-brand hover:underline font-medium">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {jobsNeedingInvoice.map((job: any) => {
                  const customer = job.customers as any
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">
                            {customer?.full_name ?? '—'}
                          </span>
                          {job.job_number && (
                            <span className="text-xs text-gray-400">#{job.job_number}</span>
                          )}
                        </div>
                        <div className="text-gray-500 text-sm truncate">{job.title}</div>
                        {job.completed_at && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            Completed {formatDate(job.completed_at)}
                          </div>
                        )}
                      </div>
                      <CreateInvoiceButton jobId={job.id} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — 2/5 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recent Invoices */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Invoices</h2>
              <Link href="/dashboard/invoices" className="text-sm text-brand hover:underline font-medium">
                View all
              </Link>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <svg className="w-9 h-9 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
                </svg>
                <p className="text-sm text-gray-500">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentInvoices.map((inv: any) => {
                  const customer = inv.customers as any
                  const isPaid = inv.status === 'paid'
                  const displayAmount = isPaid ? inv.total : inv.amount_due
                  return (
                    <Link
                      key={inv.id}
                      href={`/dashboard/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {customer?.full_name ?? '—'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {inv.invoice_number}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold text-gray-900 text-sm tabular-nums">
                          {formatCurrency(displayAmount ?? 0)}
                        </div>
                        <StatusBadge status={inv.status} className="mt-0.5" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/jobs/new"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <WrenchIcon />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  Schedule a Job
                </span>
                <ChevronRightIcon />
              </Link>

              <Link
                href="/dashboard/customers"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <PersonIcon />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  Add a Customer
                </span>
                <ChevronRightIcon />
              </Link>

              <Link
                href="/dashboard/invoices"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ReceiptIcon />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  View Invoices
                </span>
                <ChevronRightIcon />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
