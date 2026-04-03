import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { JobsViewToggle } from '@/components/jobs/JobsViewToggle'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'en_route', label: 'En Route' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; view?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const activeStatus = searchParams.status || 'all'

  let query = supabase
    .from('jobs')
    .select(
      'id, job_number, title, status, scheduled_start, customers(full_name), users!assigned_tech_id(full_name)'
    )
    .eq('company_id', userData.company_id)
    .order('scheduled_start', { ascending: true, nullsFirst: false })

  if (activeStatus === 'unscheduled') {
    query = query.eq('status', 'scheduled').is('scheduled_start', null)
  } else if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }

  const { data: jobs } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Jobs
        </h1>
        <Link href="/dashboard/jobs/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === 'all' ? '/dashboard/jobs' : `/dashboard/jobs?status=${value}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeStatus === value
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <JobsViewToggle jobs={(jobs || []) as any[]} />
    </div>
  )
}
