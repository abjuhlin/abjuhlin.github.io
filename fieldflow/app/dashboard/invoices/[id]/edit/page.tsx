'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

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

export default function EditInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [status, setStatus] = useState('')

  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [depositApplied, setDepositApplied] = useState(0)
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((inv) => {
        if (!inv?.id) return
        setInvoiceNumber(inv.invoice_number ?? '')
        setStatus(inv.status ?? '')
        setLineItems(
          Array.isArray(inv.line_items) && inv.line_items.length > 0
            ? inv.line_items.map((li: any) => ({
                id: li.id ?? generateId(),
                description: li.description ?? '',
                quantity: Number(li.quantity ?? 1),
                unit_price: Number(li.unit_price ?? 0),
                total: Number(li.total ?? 0),
              }))
            : [{ id: generateId(), description: '', quantity: 1, unit_price: 0, total: 0 }]
        )
        setTaxRate(Number(inv.tax_rate ?? 0))
        setDepositApplied(Number(inv.deposit_applied ?? 0))
        setDueDate(inv.due_date ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function updateLineItem(itemId: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = Number(updated.quantity) * Number(updated.unit_price)
        }
        return updated
      })
    )
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), description: '', quantity: 1, unit_price: 0, total: 0 },
    ])
  }

  function removeLineItem(itemId: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount
  const amountDue = Math.max(0, total - depositApplied)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (lineItems.length === 0 || lineItems.every((i) => !i.description.trim())) {
        toast.error('At least one line item is required')
        return
      }
      setSubmitting(true)
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_items: lineItems.filter((i) => i.description.trim()),
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            deposit_applied: depositApplied,
            amount_due: amountDue,
            due_date: dueDate || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update invoice')
        toast.success('Invoice updated')
        router.push(`/dashboard/invoices/${id}`)
      } catch (err: any) {
        toast.error(err.message)
        setSubmitting(false)
      }
    },
    [id, lineItems, taxRate, taxAmount, subtotal, total, depositApplied, amountDue, dueDate, router]
  )

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
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/invoices/${id}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 font-mono">{invoiceNumber}</h1>
        <span className="text-gray-400 text-sm">— Edit Invoice</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
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
                    onChange={(e) =>
                      updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                    }
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
                      onChange={(e) =>
                        updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  {idx === 0 && <label className="label text-xs">Total</label>}
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900 py-2">
                      {formatCurrency(item.total)}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove"
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
            className="mt-4 text-sm text-brand hover:text-brand/80 font-medium flex items-center gap-1"
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
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setDepositApplied(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

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
            <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2">
              <span>Amount Due</span>
              <span>{formatCurrency(amountDue)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href={`/dashboard/invoices/${id}`} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
