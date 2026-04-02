'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime, resolveJobStatus } from '@/lib/utils'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  parseISO,
  addDays,
  subDays,
} from 'date-fns'

interface Job {
  id: string
  job_number: string
  title: string
  status: string
  scheduled_start: string | null
  customers: { full_name: string } | null
  users: { full_name: string } | null
}

interface JobsViewToggleProps {
  jobs: Job[]
}

const JOB_COLORS = [
  'bg-brand/80',
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
]

function getJobColor(jobId: string) {
  let hash = 0
  for (let i = 0; i < jobId.length; i++) {
    hash = (hash * 31 + jobId.charCodeAt(i)) | 0
  }
  return JOB_COLORS[Math.abs(hash) % JOB_COLORS.length]
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        }
        title="No jobs found"
        description="No jobs match the current filter. Try a different status or create a new job."
      />
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600 whitespace-nowrap">Job #</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Title</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Tech</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell whitespace-nowrap">Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="py-3 px-4">
                  <Link href={`/dashboard/jobs/${job.id}`} className="block">
                    <span className="font-mono font-medium text-brand text-xs">{job.job_number}</span>
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Link href={`/dashboard/jobs/${job.id}`} className="block">
                    <span className="font-medium text-gray-900">
                      {job.customers?.full_name ?? '—'}
                    </span>
                    <span className="block md:hidden text-gray-500 text-xs mt-0.5 truncate max-w-[140px]">
                      {job.title}
                    </span>
                  </Link>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                  {job.title}
                </td>
                <td className="py-3 px-4 text-gray-600 hidden lg:table-cell whitespace-nowrap">
                  {(job.users as any)?.full_name ?? <span className="text-gray-400">Unassigned</span>}
                </td>
                <td className="py-3 px-4 text-gray-600 hidden sm:table-cell whitespace-nowrap text-xs">
                  {job.scheduled_start ? formatDateTime(job.scheduled_start) : '—'}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={resolveJobStatus(job.status, job.scheduled_start)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ jobs }: { jobs: Job[] }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [isMobile, setIsMobile] = useState(false)
  const [activeDayOffset, setActiveDayOffset] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  })

  const activeDay = addDays(currentWeekStart, activeDayOffset)

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const today = new Date()
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 })
    const diff = Math.round((today.getTime() - todayWeekStart.getTime()) / 86400000)
    setActiveDayOffset(diff)
  }

  const prevWeek = () => {
    setCurrentWeekStart((d) => subWeeks(d, 1))
    setActiveDayOffset(0)
  }

  const nextWeek = () => {
    setCurrentWeekStart((d) => addWeeks(d, 1))
    setActiveDayOffset(0)
  }

  const prevDay = () => {
    if (activeDayOffset > 0) {
      setActiveDayOffset((o) => o - 1)
    } else {
      setCurrentWeekStart((d) => subWeeks(d, 1))
      setActiveDayOffset(6)
    }
  }

  const nextDay = () => {
    if (activeDayOffset < 6) {
      setActiveDayOffset((o) => o + 1)
    } else {
      setCurrentWeekStart((d) => addWeeks(d, 1))
      setActiveDayOffset(0)
    }
  }

  const getJobsForDay = (day: Date) =>
    jobs.filter((job) => job.scheduled_start && isSameDay(parseISO(job.scheduled_start), day))

  const weekLabel = `${format(currentWeekStart, 'MMM d')} – ${format(
    endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    'MMM d, yyyy'
  )}`

  // ── Mobile: single-day view ──────────────────────────────────────────────

  if (isMobile) {
    const dayJobs = getJobsForDay(activeDay)
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevDay} className="btn-secondary p-2" aria-label="Previous day">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p
              className={`text-lg font-semibold ${isToday(activeDay) ? 'text-brand' : 'text-gray-900'}`}
            >
              {format(activeDay, 'EEEE')}
            </p>
            <p className="text-sm text-gray-500">{format(activeDay, 'MMM d, yyyy')}</p>
          </div>
          <button onClick={nextDay} className="btn-secondary p-2" aria-label="Next day">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button onClick={goToToday} className="btn-secondary text-sm w-full mb-4">
          Today
        </button>
        {dayJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No jobs scheduled</div>
        ) : (
          <div className="space-y-2">
            {dayJobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className={`block p-3 rounded-lg text-white ${getJobColor(job.id)}`}
              >
                <p className="text-xs font-medium opacity-80">
                  {job.scheduled_start ? format(parseISO(job.scheduled_start), 'h:mm a') : 'No time'}
                </p>
                <p className="font-semibold text-sm leading-tight">{job.customers?.full_name ?? '—'}</p>
                <p className="text-xs opacity-80 truncate">{job.title}</p>
                {(job.users as any)?.full_name && (
                  <p className="text-xs opacity-70 mt-0.5">{(job.users as any).full_name}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: weekly view ─────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="btn-secondary p-2" aria-label="Previous week">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={nextWeek} className="btn-secondary p-2" aria-label="Next week">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
        <button onClick={goToToday} className="btn-secondary text-sm ml-1">
          Today
        </button>
      </div>

      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 divide-x divide-gray-200 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`py-2 text-center ${isToday(day) ? 'bg-brand/5' : ''}`}
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {format(day, 'EEE')}
              </p>
              <p
                className={`text-lg font-semibold leading-tight ${
                  isToday(day) ? 'text-brand' : 'text-gray-900'
                }`}
              >
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Job slots */}
        <div className="grid grid-cols-7 divide-x divide-gray-200 min-h-[320px] items-start">
          {weekDays.map((day) => {
            const dayJobs = getJobsForDay(day)
            return (
              <div
                key={day.toISOString()}
                className={`p-1.5 space-y-1 ${isToday(day) ? 'bg-brand/5' : ''}`}
              >
                {dayJobs.length === 0 ? (
                  <div className="h-4" />
                ) : (
                  dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/dashboard/jobs/${job.id}`}
                      className={`block p-1.5 rounded text-white text-xs ${getJobColor(job.id)} hover:opacity-90 transition-opacity`}
                    >
                      <p className="font-medium opacity-80 leading-none mb-0.5">
                        {job.scheduled_start
                          ? format(parseISO(job.scheduled_start), 'h:mma')
                          : ''}
                      </p>
                      <p className="font-semibold leading-tight truncate">
                        {job.customers?.full_name ?? '—'}
                      </p>
                      {(job.users as any)?.full_name && (
                        <p className="opacity-70 leading-tight truncate">
                          {(job.users as any).full_name}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Toggle Component ────────────────────────────────────────────────────

export function JobsViewToggle({ jobs }: JobsViewToggleProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
              view === 'list'
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors border-l border-gray-200 ${
              view === 'calendar'
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Calendar
          </button>
        </div>
      </div>

      {view === 'list' ? <ListView jobs={jobs} /> : <CalendarView jobs={jobs} />}
    </div>
  )
}
