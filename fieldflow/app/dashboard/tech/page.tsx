import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime, resolveJobStatus } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default async function TechPortalPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, role, company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Fetch jobs assigned to this tech
  const { data: allJobs } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, status, description,
      scheduled_start, scheduled_end, address, city, state, zip,
      customers ( full_name, phone )
    `)
    .eq('assigned_tech_id', userData.id)
    .eq('company_id', userData.company_id)
    .in('status', ['scheduled', 'en_route', 'in_progress', 'complete'])
    .order('scheduled_start', { ascending: true, nullsFirst: false })

  const jobs = allJobs ?? []

  const todayJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false
    const d = new Date(j.scheduled_start)
    return d >= today && d < tomorrow
  })

  const upcomingJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false
    const d = new Date(j.scheduled_start)
    return d >= tomorrow && d < weekEnd
  })

  const inProgressJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'en_route')
  const unscheduledJobs = jobs.filter(j => j.status === 'scheduled' && !j.scheduled_start)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          My Jobs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {userData.full_name}
        </p>
      </div>

      {/* Active jobs banner */}
      {inProgressJobs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Now</h2>
          <div className="space-y-3">
            {inProgressJobs.map(job => {
              const customer = job.customers as any
              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                  className="block card p-4 border-l-4 border-brand hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{customer?.full_name}</div>
                      {(job.address || job.city) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {[job.address, job.city, job.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={resolveJobStatus(job.status, job.scheduled_start)} />
                  </div>
                  {customer?.phone && (
                    <a href={`tel:${customer.phone}`} onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-brand mt-2 hover:underline">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {customer.phone}
                    </a>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's jobs */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Today ({todayJobs.length})
        </h2>
        {todayJobs.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">No jobs scheduled for today</div>
        ) : (
          <div className="space-y-2">
            {todayJobs.map(job => {
              const customer = job.customers as any
              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                  className="block card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{job.job_number}</span>
                        <StatusBadge status={resolveJobStatus(job.status, job.scheduled_start)} />
                      </div>
                      <div className="font-medium text-gray-900 mt-1">{job.title}</div>
                      <div className="text-sm text-gray-600">{customer?.full_name}</div>
                      {job.scheduled_start && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(job.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {job.scheduled_end && ` — ${new Date(job.scheduled_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                        </div>
                      )}
                    </div>
                    {(job.address || job.city) && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent([job.address, job.city, job.state, job.zip].filter(Boolean).join(', '))}`}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex-shrink-0 p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-brand/10 hover:text-brand transition-colors"
                        title="Navigate">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Upcoming this week */}
      {upcomingJobs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Upcoming This Week ({upcomingJobs.length})
          </h2>
          <div className="space-y-2">
            {upcomingJobs.map(job => {
              const customer = job.customers as any
              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                  className="block card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-600">{customer?.full_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {job.scheduled_start && new Date(job.scheduled_start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {job.scheduled_start && new Date(job.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Unscheduled */}
      {unscheduledJobs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Unscheduled ({unscheduledJobs.length})
          </h2>
          <div className="space-y-2">
            {unscheduledJobs.map(job => {
              const customer = job.customers as any
              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                  className="block card p-3 border-l-4 border-amber-300 hover:shadow-md transition-shadow">
                  <div className="font-medium text-gray-900 text-sm">{job.title}</div>
                  <div className="text-xs text-gray-500">{customer?.full_name} — awaiting scheduling</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
