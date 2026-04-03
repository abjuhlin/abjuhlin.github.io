'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

interface TeamMember {
  id: string
  full_name: string
  role: string
}

export default function EditJobPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [techId, setTechId] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${id}`).then((r) => r.json()),
      fetch('/api/team').then((r) => r.json()),
    ]).then(([job, team]) => {
      if (job?.id) {
        setTitle(job.title ?? '')
        setDescription(job.description ?? '')
        setScheduledStart(job.scheduled_start ? job.scheduled_start.slice(0, 16) : '')
        setScheduledEnd(job.scheduled_end ? job.scheduled_end.slice(0, 16) : '')
        setTechId(job.assigned_tech_id ?? '')
        setAddress(job.address ?? '')
        setCity(job.city ?? '')
        setState(job.state ?? '')
        setZip(job.zip ?? '')
        setInternalNotes(job.internal_notes ?? '')
        setStatus(job.status ?? '')
      }
      setTeamMembers(Array.isArray(team) ? team : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Job title is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_start: scheduledStart || null,
          scheduled_end: scheduledEnd || null,
          assigned_tech_id: techId || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
          internal_notes: internalNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update job')
      toast.success('Job updated')
      router.push(`/dashboard/jobs/${id}`)
    } catch (err: any) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <svg className="animate-spin h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/jobs/${id}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Edit Job
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Details</h2>

          <div>
            <label className="label">Job Title *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Scheduled Start</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Scheduled End</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Assigned Technician</label>
            <select className="input" value={techId} onChange={(e) => setTechId(e.target.value)}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="en_route">En Route</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Address</h2>

          <div>
            <AddressAutocomplete
              label="Street Address"
              value={address}
              onChange={setAddress}
              onSelect={(parts) => {
                setAddress(parts.address)
                setCity(parts.city)
                setState(parts.state)
                setZip(parts.zip)
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">City</label>
              <input type="text" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input uppercase"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="max-w-[140px]">
            <label className="label">ZIP</label>
            <input type="text" className="input" maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
        </div>

        <div className="card p-5">
          <label className="label">Internal Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Notes visible only to your team..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/dashboard/jobs/${id}`} className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
