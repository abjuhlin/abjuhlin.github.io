'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
}

interface Proposal {
  id: string
  proposal_number: string
  title: string
  total: number
  status: string
  created_at: string
}

interface Job {
  id: string
  job_number: string
  title: string
  status: string
  scheduled_start: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  total: number
  amount_due: number
  status: string
  due_date: string | null
}

interface CustomerTabsProps {
  customer: Customer
  proposals: Proposal[]
  jobs: Job[]
  invoices: Invoice[]
}

type Tab = 'overview' | 'proposals' | 'jobs' | 'invoices'

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-gray-400 hover:text-brand transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState(customer.notes || '')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/customers/${customer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: value }),
        })
        if (!res.ok) throw new Error('Failed to save')
        toast.success('Notes saved')
      } catch {
        toast.error('Failed to save notes')
      } finally {
        setSaving(false)
      }
    },
    [customer.id]
  )

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveNotes(value)
    }, 1000)
  }

  const handleNotesBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (notes !== (customer.notes || '')) {
      saveNotes(notes)
    }
  }

  const fullAddress = [
    customer.address,
    customer.city,
    customer.state && customer.zip
      ? `${customer.state} ${customer.zip}`
      : customer.state || customer.zip,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact Info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Contact Information
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Phone</dt>
            <dd className="flex items-center text-sm text-gray-900">
              <a href={`tel:${customer.phone}`} className="hover:text-brand transition-colors">
                {customer.phone}
              </a>
              <CopyButton value={customer.phone} label="Phone" />
            </dd>
          </div>
          {customer.email && (
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Email</dt>
              <dd className="flex items-center text-sm text-gray-900">
                <a
                  href={`mailto:${customer.email}`}
                  className="hover:text-brand transition-colors truncate"
                >
                  {customer.email}
                </a>
                <CopyButton value={customer.email} label="Email" />
              </dd>
            </div>
          )}
          {fullAddress && (
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Address</dt>
              <dd className="text-sm text-gray-900">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors leading-snug block"
                >
                  {customer.address && <span className="block">{customer.address}</span>}
                  <span className="block">
                    {[customer.city, customer.state].filter(Boolean).join(', ')}
                    {customer.zip && ` ${customer.zip}`}
                  </span>
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Customer since</dt>
            <dd className="text-sm text-gray-900">{formatDate(customer.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Internal Notes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Internal Notes
          </h2>
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving…
            </span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          placeholder="Add private notes about this customer (not visible to them)..."
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand resize-none placeholder-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1.5">Auto-saves when you stop typing or leave the field.</p>
      </div>
    </div>
  )
}

// ─── Proposals Tab ────────────────────────────────────────────────────────────

function ProposalsTab({
  proposals,
  customerId,
}: {
  proposals: Proposal[]
  customerId: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {proposals.length} {proposals.length === 1 ? 'estimate' : 'estimates'}
        </p>
        <Link
          href={`/dashboard/proposals/new?customer=${customerId}`}
          className="btn-primary text-sm"
        >
          New Estimate
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 text-sm">
          No estimates yet.{' '}
          <Link
            href={`/dashboard/proposals/new?customer=${customerId}`}
            className="text-brand hover:underline"
          >
            Create the first one
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                  Total
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proposals.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    <Link href={`/dashboard/proposals/${p.id}`} className="hover:text-brand">
                      {p.proposal_number}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/proposals/${p.id}`}
                      className="font-medium text-gray-900 hover:text-brand"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 hidden sm:table-cell">
                    {formatCurrency(p.total)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab({ jobs, customerId }: { jobs: Job[]; customerId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        </p>
        <Link
          href={`/dashboard/jobs/new?customer=${customerId}`}
          className="btn-primary text-sm"
        >
          New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 text-sm">
          No jobs yet.{' '}
          <Link
            href={`/dashboard/jobs/new?customer=${customerId}`}
            className="text-brand hover:underline"
          >
            Schedule the first one
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                  Scheduled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    <Link href={`/dashboard/jobs/${j.id}`} className="hover:text-brand">
                      {j.job_number}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/jobs/${j.id}`}
                      className="font-medium text-gray-900 hover:text-brand"
                    >
                      {j.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden sm:table-cell">
                    {j.scheduled_start ? formatDate(j.scheduled_start) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 text-sm">
          No invoices yet. Invoices are created from completed jobs.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                  Total
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount Due</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="hover:text-brand">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 hidden sm:table-cell">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="hover:text-brand">
                      <span
                        className={
                          inv.status === 'overdue'
                            ? 'font-semibold text-orange-600'
                            : inv.status === 'paid'
                            ? 'text-gray-400 line-through'
                            : 'font-medium text-gray-900'
                        }
                      >
                        {formatCurrency(inv.amount_due)}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                    {inv.due_date ? formatDate(inv.due_date) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'proposals', label: 'Estimates' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'invoices', label: 'Invoices' },
]

export function CustomerTabs({ customer, proposals, jobs, invoices }: CustomerTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabCounts: Partial<Record<Tab, number>> = {
    proposals: proposals.length,
    jobs: jobs.length,
    invoices: invoices.length,
  }

  return (
    <div>
      {/* Tab Nav */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-1" aria-label="Tabs">
          {TABS.map(({ key, label }) => {
            const count = tabCounts[key]
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-brand/10 text-brand'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab customer={customer} />}
      {activeTab === 'proposals' && (
        <ProposalsTab proposals={proposals} customerId={customer.id} />
      )}
      {activeTab === 'jobs' && <JobsTab jobs={jobs} customerId={customer.id} />}
      {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
    </div>
  )
}
