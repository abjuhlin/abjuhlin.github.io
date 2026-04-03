'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CustomerModal } from '@/components/customers/CustomerModal'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

interface Customer {
  id: string
  full_name: string
  phone: string
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface TeamMember {
  id: string
  full_name: string
  role: string
}

interface Proposal {
  id: string
  proposal_number: string
  title: string
}

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preCustomerId = searchParams.get('customer')
  const preProposalId = searchParams.get('proposal')

  // Form state
  const [customerId, setCustomerId] = useState(preCustomerId ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

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

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [proposalRef, setProposalRef] = useState<Proposal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [companyId, setCompanyId] = useState('')

  // Fetch current user's company_id
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => { if (data?.company_id) setCompanyId(data.company_id) })
      .catch(() => {})
  }, [])

  // Fetch customers for search
  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((data: Customer[]) => {
        setCustomers(data || [])
        if (preCustomerId) {
          const found = (data || []).find((c) => c.id === preCustomerId)
          if (found) {
            setSelectedCustomer(found)
            setCustomerSearch(found.full_name)
            setCustomerId(found.id)
            prefillAddress(found)
          }
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preCustomerId])

  // Fetch team members
  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setTeamMembers(data || []))
      .catch(() => {})
  }, [])

  // Fetch proposal if pre-filled
  useEffect(() => {
    if (!preProposalId) return
    fetch(`/api/proposals`)
      .then((r) => r.json())
      .then((data: Proposal[]) => {
        const found = (data || []).find((p) => p.id === preProposalId)
        if (found) {
          setProposalRef(found)
          if (!title) setTitle(found.title)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preProposalId])

  function prefillAddress(customer: Customer) {
    if (customer.address) setAddress(customer.address)
    if (customer.city) setCity(customer.city)
    if (customer.state) setState(customer.state)
    if (customer.zip) setZip(customer.zip)
  }

  const filteredCustomers = customers.filter((c) =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setCustomerId(c.id)
    setCustomerSearch(c.full_name)
    setShowCustomerDropdown(false)
    prefillAddress(c)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }
    if (!title.trim()) {
      toast.error('Job title is required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          proposal_id: preProposalId ?? undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          scheduled_start: scheduledStart || undefined,
          scheduled_end: scheduledEnd || undefined,
          assigned_tech_id: techId || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
          internal_notes: internalNotes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create job')
      }

      toast.success(`Job ${data.job_number} created`)
      router.push(`/dashboard/jobs/${data.id}`)
    } catch (err: any) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  function handleCustomerCreated(newCustomer: any) {
    if (newCustomer?.id) {
      const c: Customer = {
        id: newCustomer.id,
        full_name: newCustomer.full_name ?? '',
        phone: newCustomer.phone ?? '',
        email: newCustomer.email ?? null,
        address: newCustomer.address ?? null,
        city: newCustomer.city ?? null,
        state: newCustomer.state ?? null,
        zip: newCustomer.zip ?? null,
      }
      setCustomers((prev) => [c, ...prev])
      selectCustomer(c)
    }
    setShowCustomerModal(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/jobs" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          New Job
        </h1>
      </div>

      {proposalRef && (
        <div className="mb-5 p-3 bg-brand/5 border border-brand/20 rounded-lg text-sm text-brand flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>
            Created from estimate{' '}
            <span className="font-semibold">{proposalRef.proposal_number}</span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Customer</h2>

          <div className="relative">
            <label className="label">Customer *</label>
            <input
              type="text"
              className="input"
              placeholder="Search by name or phone..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
                if (!e.target.value) {
                  setCustomerId('')
                  setSelectedCustomer(null)
                }
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              autoComplete="off"
            />
            {showCustomerDropdown && (filteredCustomers.length > 0 || customerSearch.trim()) && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredCustomers.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                    onMouseDown={() => selectCustomer(c)}
                  >
                    <span className="font-medium text-gray-900">{c.full_name}</span>
                    <span className="ml-2 text-gray-500 text-xs">{c.phone}</span>
                  </button>
                ))}
                {customerSearch.trim() && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-brand/5 text-sm border-t border-gray-100 flex items-center gap-2 text-brand font-medium"
                    onMouseDown={() => {
                      setShowCustomerDropdown(false)
                      setShowCustomerModal(true)
                    }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create "{customerSearch.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Job details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Details</h2>

          <div>
            <label className="label">Job Title *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. AC repair, Drain cleaning..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Describe the work to be done..."
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
            <select
              className="input"
              value={techId}
              onChange={(e) => setTechId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
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
              <input
                type="text"
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input"
                maxLength={2}
                placeholder="TX"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="max-w-[140px]">
            <label className="label">ZIP</label>
            <input
              type="text"
              className="input"
              maxLength={10}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>
        </div>

        {/* Internal notes */}
        <div className="card p-5">
          <label className="label">Internal Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Notes visible only to your team..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
          <Link href="/dashboard/jobs" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
        </div>
      </form>

      {showCustomerModal && companyId && (
        <CustomerModal
          companyId={companyId}
          initialName={customerSearch.trim()}
          onClose={() => setShowCustomerModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}
    </div>
  )
}
