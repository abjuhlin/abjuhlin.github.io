'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

interface Job {
  id: string
  title: string
  job_number: string
  customer_id: string
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedJobId, setSelectedJobId] = useState('')

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, total: 0 },
  ])
  const [taxRate, setTaxRate] = useState(0)
  const [depositApplied, setDepositApplied] = useState(0)
  const [dueDate, setDueDate] = useState(defaultDueDate())

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load customers
  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Load jobs when customer selected
  useEffect(() => {
    if (!selectedCustomer) {
      setJobs([])
      setSelectedJobId('')
      return
    }
    fetch(`/api/jobs?customer_id=${selectedCustomer.id}`)
      .then(r => r.json())
      .then(data => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]))
  }, [selectedCustomer])

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch) ||
    (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
  )

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setCustomerSearch(c.full_name)
    setShowCustomerDropdown(false)
    setSelectedJobId('')
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = Number(updated.quantity) * Number(updated.unit_price)
        }
        return updated
      })
    )
  }

  function addLineItem() {
    setLineItems(prev => [
      ...prev,
      { id: generateId(), description: '', quantity: 1, unit_price: 0, total: 0 },
    ])
  }

  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount
  const amountDue = Math.max(0, total - depositApplied)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedCustomer) {
      setError('Please select a customer.')
      return
    }
    if (lineItems.length === 0 || lineItems.every(i => !i.description.trim())) {
      setError('Please add at least one line item.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        job_id: selectedJobId || null,
        line_items: lineItems.filter(i => i.description.trim()),
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        deposit_applied: depositApplied,
        amount_due: amountDue,
        due_date: dueDate || null,
        status: 'draft',
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create invoice.')
        return
      }

      router.push(`/dashboard/invoices/${data.id}`)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }, [selectedCustomer, selectedJobId, lineItems, taxRate, taxAmount, subtotal, total, depositApplied, amountDue, dueDate, router])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Customer</h2>
          <div className="relative">
            <label className="label">Customer *</label>
            <input
              type="text"
              className="input"
              placeholder="Search by name, phone, or email..."
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
                if (!e.target.value) setSelectedCustomer(null)
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              autoComplete="off"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.slice(0, 10).map(c => (
                  <li
                    key={c.id}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    onMouseDown={() => selectCustomer(c)}
                  >
                    <div className="font-medium text-gray-900">{c.full_name}</div>
                    {(c.phone || c.email) && (
                      <div className="text-xs text-gray-500 mt-0.5">{c.phone}{c.phone && c.email ? ' · ' : ''}{c.email}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-3">
              <label className="label">Job Reference (optional)</label>
              <select
                className="input"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
              >
                <option value="">— No job linked —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.job_number} — {j.title}
                  </option>
                ))}
              </select>
              {jobs.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No jobs found for this customer.</p>
              )}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Line Items</h2>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-5">
                  {idx === 0 && <label className="label text-xs">Description</label>}
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Service or part description"
                    value={item.description}
                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="label text-xs">Qty</label>}
                  <input
                    type="number"
                    className="input text-sm"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  {idx === 0 && <label className="label text-xs">Unit Price</label>}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      className="input text-sm pl-7"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  {idx === 0 && <label className="label text-xs">Total</label>}
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900 min-w-0 truncate py-2">{formatCurrency(item.total)}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="Remove line item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="mt-4 text-sm text-brand hover:text-brand/80 font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add line item
          </button>
        </div>

        {/* Totals & Settings */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Totals & Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Tax Rate (%)</label>
              <input
                type="number"
                className="input"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">Deposit Applied ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  className="input pl-7"
                  min="0"
                  step="0.01"
                  value={depositApplied}
                  onChange={e => setDepositApplied(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Total</span>
              <span className="font-medium text-gray-900">{formatCurrency(total)}</span>
            </div>
            {depositApplied > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Deposit Applied</span>
                <span className="text-green-600">− {formatCurrency(depositApplied)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
              <span>Amount Due</span>
              <span>{formatCurrency(amountDue)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/dashboard/invoices" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating...
              </>
            ) : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
