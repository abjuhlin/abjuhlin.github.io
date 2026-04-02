import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, full_name, role, companies(name, primary_color, google_review_url, review_request_delay_hours)')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const company = userData?.companies as any

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch all stats in parallel
  const [
    { count: openProposals },
    { count: todayJobs },
    { count: completedThisMonth },
    { data: unpaidInvoices },
    { data: todaySchedule },
    { data: recentUnpaidInvoices },
    { count: reviewRequestsThisMonth },
  ] = await Promise.all([
    supabase.from('proposals').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).in('status', ['draft', 'sent', 'viewed']),
    supabase.from('jobs').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'scheduled')
      .gte('scheduled_start', todayStart).lt('scheduled_start', todayEnd),
    supabase.from('jobs').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'complete')
      .gte('completed_at', monthStart),
    supabase.from('invoices').select('amount_due')
      .eq('company_id', companyId).in('status', ['sent', 'overdue']),
    supabase.from('jobs')
      .select('id, title, status, scheduled_start, customers(full_name), users!assigned_tech_id(full_name)')
      .eq('company_id', companyId).eq('status', 'scheduled')
      .gte('scheduled_start', todayStart).lt('scheduled_start', todayEnd)
      .order('scheduled_start'),
    supabase.from('invoices')
      .select('id, invoice_number, amount_due, status, due_date, customers(full_name)')
      .eq('company_id', companyId).in('status', ['sent', 'overdue'])
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('sms_log').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('message_type', 'review_request')
      .gte('created_at', monthStart),
  ])

  const totalUnpaid = (unpaidInvoices || []).reduce((sum, inv) => sum + (inv.amount_due || 0), 0)

  const stats = [
    {
      label: 'Open Proposals',
      value: openProposals ?? 0,
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      href: '/dashboard/proposals',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: "Today's Jobs",
      value: todayJobs ?? 0,
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      href: '/dashboard/jobs',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Unpaid Invoices',
      value: formatCurrency(totalUnpaid),
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      href: '/dashboard/invoices',
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Completed This Month',
      value: completedThisMonth ?? 0,
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      href: '/dashboard/jobs?status=complete',
      color: 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Welcome back{userData?.full_name ? `, ${userData.full_name.split(' ')[0]}` : ''}!</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/proposals/new"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand/5 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">New Proposal</div>
              <div className="text-xs text-gray-500">Send a quote to a client</div>
            </div>
          </Link>
          <Link href="/dashboard/jobs/new"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand/5 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">New Job</div>
              <div className="text-xs text-gray-500">Schedule a service call</div>
            </div>
          </Link>
          <Link href="/dashboard/customers?new=1"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand/5 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">New Customer</div>
              <div className="text-xs text-gray-500">Add a contact</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <Link href="/dashboard/jobs" className="text-sm text-brand hover:underline">View all</Link>
          </div>
          {!todaySchedule || todaySchedule.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-sm">No jobs scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((job: any) => (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                  className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{job.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {(job.customers as any)?.full_name}
                      {(job.users as any)?.full_name && ` · ${(job.users as any).full_name}`}
                    </div>
                    {job.scheduled_start && (
                      <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(job.scheduled_start)}</div>
                    )}
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Outstanding Invoices */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h2>
            <Link href="/dashboard/invoices" className="text-sm text-brand hover:underline">View all</Link>
          </div>
          {!recentUnpaidInvoices || recentUnpaidInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
              <p className="text-sm">No outstanding invoices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUnpaidInvoices.map((inv: any) => (
                <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-500">{(inv.customers as any)?.full_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">{formatCurrency(inv.amount_due)}</div>
                    <StatusBadge status={inv.status} className="mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reputation card */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Reputation</h2>
        {company?.google_review_url ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{reviewRequestsThisMonth ?? 0}</span> review requests sent this month
              </p>
              <a href={company.google_review_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-brand hover:underline mt-1 block">
                View your Google Business profile →
              </a>
            </div>
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="text-sm text-amber-800">Add your Google review link in Settings to start collecting reviews automatically after jobs are completed.</p>
              <Link href="/dashboard/settings?tab=reviews" className="text-sm font-medium text-amber-900 underline mt-1 block">
                Go to Settings →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
