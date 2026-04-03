'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { resolveJobStatus } from '@/lib/utils'

interface CalEvent {
  id: string
  type: 'job' | 'invoice'
  title: string
  date: string // ISO date string (YYYY-MM-DD)
  status: string
  href: string
  customerName?: string
  scheduledStart?: string | null
}

interface Props {
  events: CalEvent[]
  initialYear: number
  initialMonth: number // 0-indexed
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function eventColor(type: 'job' | 'invoice', status: string) {
  if (type === 'invoice') {
    if (status === 'paid') return 'bg-green-100 text-green-800 border-green-200'
    if (status === 'overdue') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  // job
  if (status === 'complete' || status === 'invoiced' || status === 'paid') {
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }
  if (status === 'in_progress' || status === 'en_route') {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }
  return 'bg-brand/10 text-brand border-brand/20'
}

export function CalendarGrid({ events, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  // Build calendar days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0 = Sun
  const totalDays = lastDay.getDate()

  // Pad before
  const leadingBlanks = startDow
  // Pad after to complete the last row
  const totalCells = Math.ceil((leadingBlanks + totalDays) / 7) * 7

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const ev of events) {
      const d = ev.date?.slice(0, 10)
      if (!d) continue
      // Only show events in current month view (plus neighboring cells)
      if (!map[d]) map[d] = []
      map[d].push(ev)
    }
    return map
  }, [events])

  const cells: Array<{ day: number | null; dateStr: string | null }> = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1
    if (dayNum < 1 || dayNum > totalDays) {
      cells.push({ day: null, dateStr: null })
    } else {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      cells.push({ day: dayNum, dateStr })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-brand/10 border border-brand/20 inline-block" />
          Job
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200 inline-block" />
          Invoice due
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" />
          Overdue
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
          Paid
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-b border-gray-200 bg-gray-50"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr
          const dayEvents = cell.dateStr ? (eventsByDate[cell.dateStr] ?? []) : []

          return (
            <div
              key={idx}
              className={`border-r border-b border-gray-200 min-h-[100px] p-1.5 ${
                cell.day ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              {cell.day !== null && (
                <>
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday
                        ? 'bg-brand text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <Link
                        key={ev.id}
                        href={ev.href}
                        className={`block text-xs px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity ${eventColor(ev.type, ev.status)}`}
                        title={`${ev.type === 'invoice' ? 'INV Due: ' : ''}${ev.title}${ev.customerName ? ` — ${ev.customerName}` : ''}`}
                      >
                        {ev.type === 'invoice' && (
                          <span className="font-semibold mr-1">$</span>
                        )}
                        {ev.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1.5">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
