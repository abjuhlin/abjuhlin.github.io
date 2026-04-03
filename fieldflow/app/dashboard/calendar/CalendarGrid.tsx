'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'

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

interface CalendarGridProps {
  events: CalEvent[]
  initialYear: number
  initialMonth: number
}

function jobColor(status: string): string {
  switch (status) {
    case 'in_progress':
    case 'en_route':
      return '#E86C3A'
    case 'complete':
    case 'invoiced':
    case 'paid':
      return '#6b7280'
    case 'cancelled':
      return '#ef4444'
    default:
      return '#3b82f6'
  }
}

function invoiceColor(status: string): string {
  switch (status) {
    case 'paid':
      return '#10b981'
    case 'overdue':
      return '#ef4444'
    default:
      return '#6366f1'
  }
}

export function CalendarGrid({ events, initialYear, initialMonth }: CalendarGridProps) {
  const router = useRouter()
  const calRef = useRef<FullCalendar>(null)

  const fcEvents: EventInput[] = events.map((ev) => {
    const isJob = ev.type === 'job'
    const color = isJob ? jobColor(ev.status) : invoiceColor(ev.status)
    const start = isJob && ev.scheduledStart ? ev.scheduledStart : ev.date
    const end = isJob && ev.scheduledEnd ? ev.scheduledEnd : undefined
    const allDay = isJob ? !ev.scheduledStart?.includes('T') : true
    const displayTitle = ev.customerName
      ? `${ev.customerName} — ${ev.title}`
      : ev.title

    return {
      id: ev.id,
      title: displayTitle,
      start,
      end,
      allDay,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      editable: isJob,
      extendedProps: { type: ev.type, href: ev.href, status: ev.status },
    }
  })

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault()
      const href = info.event.extendedProps.href as string
      if (href) router.push(href)
    },
    [router]
  )

  const patchJob = useCallback(async (
    jobId: string,
    newStart: string,
    newEnd: string | null,
    revert: () => void
  ) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_start: newStart, scheduled_end: newEnd }),
      })
      if (!res.ok) revert()
    } catch {
      revert()
    }
  }, [])

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const newStart = info.event.start?.toISOString()
      if (!newStart) { info.revert(); return }
      patchJob(info.event.id, newStart, info.event.end?.toISOString() ?? null, info.revert)
    },
    [patchJob]
  )

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      const newStart = info.event.start?.toISOString()
      if (!newStart) { info.revert(); return }
      patchJob(info.event.id, newStart, info.event.end?.toISOString() ?? null, info.revert)
    },
    [patchJob]
  )

  return (
    <>
      <style>{`
        .fc { font-family: inherit; }
        .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; color: #111827; }
        .fc .fc-button {
          background: #ffffff; border: 1px solid #d1d5db; color: #374151;
          font-size: 0.8rem; font-weight: 500; padding: 5px 12px;
          border-radius: 6px; box-shadow: none; text-transform: capitalize;
        }
        .fc .fc-button:hover { background: #f9fafb; border-color: #9ca3af; }
        .fc .fc-button:focus { box-shadow: 0 0 0 2px rgba(232,108,58,0.3); }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: #E86C3A !important; border-color: #E86C3A !important; color: #fff !important;
        }
        .fc .fc-button-group .fc-button { border-radius: 0; }
        .fc .fc-button-group .fc-button:first-child { border-radius: 6px 0 0 6px; }
        .fc .fc-button-group .fc-button:last-child { border-radius: 0 6px 6px 0; }
        .fc .fc-col-header-cell {
          background: #f9fafb; font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; padding: 8px 0;
        }
        .fc .fc-daygrid-day-number { font-size: 0.8rem; color: #6b7280; padding: 4px 6px; }
        .fc .fc-day-today { background: rgba(232,108,58,0.04) !important; }
        .fc .fc-day-today .fc-daygrid-day-number {
          background: #E86C3A; color: #fff; border-radius: 50%;
          width: 24px; height: 24px; display: inline-flex;
          align-items: center; justify-content: center; font-weight: 700;
        }
        .fc .fc-event { cursor: pointer; font-size: 0.75rem; font-weight: 500; border-radius: 5px; }
        .fc .fc-timegrid-event .fc-event-main { padding: 2px 5px; }
        .fc .fc-timegrid-event-harness { margin: 0 1px; }
        .fc-direction-ltr .fc-daygrid-event.fc-event-end { margin-right: 2px; }
        .fc-direction-ltr .fc-daygrid-event.fc-event-start { margin-left: 2px; }
        .fc-v-event { border-radius: 5px; }
        .fc .fc-timegrid-axis-cushion { font-size: 0.7rem; color: #9ca3af; }
        .fc .fc-scrollgrid { border-color: #e5e7eb; }
        .fc .fc-scrollgrid td, .fc .fc-scrollgrid th { border-color: #e5e7eb; }
        .fc .fc-now-indicator-line { border-color: #E86C3A; }
        .fc .fc-now-indicator-arrow { border-top-color: #E86C3A; border-bottom-color: #E86C3A; }
      `}</style>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="p-4 h-full">
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={new Date(initialYear, initialMonth, 1)}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
            height="100%"
            events={fcEvents}
            editable={true}
            droppable={false}
            eventResizableFromStart={true}
            eventDurationEditable={true}
            snapDuration="00:15:00"
            slotDuration="00:30:00"
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={true}
            nowIndicator={true}
            dayMaxEvents={3}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventInteractive={true}
          />
        </div>
      </div>
    </>
  )
}
