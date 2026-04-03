'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InvoiceStatus } from '@/types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface InvoiceActionsProps {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmPayment, setConfirmPayment] = useState(false)
  const [confirmVoid, setConfirmVoid] = useState(false)

  function downloadPdf() {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
  }

  async function emailInvoice() {
    setError('')
    setLoading('email')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/email`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to email invoice.')
        return
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(null)
    }
  }

  async function sendInvoice() {
    setError('')
    setLoading('send')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send invoice.')
        return
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(null)
    }
  }

  async function recordPayment() {
    setError('')
    setLoading('pay')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to record payment.')
        return
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(null)
    }
  }

  async function sendReminder() {
    setError('')
    setLoading('remind')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send reminder.')
        return
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(null)
    }
  }

  async function voidInvoice() {
    setError('')
    setLoading('void')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'void' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to void invoice.')
        return
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 mb-8">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h2>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === 'draft' && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/invoices/${invoiceId}/edit`}
            className="btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Invoice
          </Link>
          <button
            onClick={sendInvoice}
            disabled={loading === 'send'}
            className="btn-primary text-sm"
          >
            {loading === 'send' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Invoice
              </>
            )}
          </button>
          <button
            onClick={downloadPdf}
            className="btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={emailInvoice}
            disabled={loading === 'email'}
            className="btn-secondary text-sm"
          >
            {loading === 'email' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Emailing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Invoice
              </>
            )}
          </button>
        </div>
      )}

      {(status === 'sent' || status === 'overdue') && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={sendInvoice}
            disabled={loading === 'send'}
            className="btn-secondary text-sm"
          >
            {loading === 'send' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Resending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Resend Invoice
              </>
            )}
          </button>
          <button
            onClick={sendReminder}
            disabled={loading === 'remind'}
            className="btn-secondary text-sm"
          >
            {loading === 'remind' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Send Reminder
              </>
            )}
          </button>
          <button
            onClick={downloadPdf}
            className="btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={emailInvoice}
            disabled={loading === 'email'}
            className="btn-secondary text-sm"
          >
            {loading === 'email' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Emailing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Invoice
              </>
            )}
          </button>
          <button
            onClick={() => setConfirmPayment(true)}
            disabled={loading === 'pay'}
            className="btn-primary text-sm"
          >
            {loading === 'pay' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Recording...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Record Manual Payment
              </>
            )}
          </button>
          <button
            onClick={() => setConfirmVoid(true)}
            disabled={loading === 'void'}
            className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50"
          >
            {loading === 'void' ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Voiding...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Void Invoice
              </>
            )}
          </button>
        </div>
      )}

      {status === 'paid' && (
        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This invoice has been paid. No further actions available.
        </div>
      )}

      {status === 'void' && (
        <div className="text-sm text-gray-500">
          This invoice has been voided.
        </div>
      )}

      <ConfirmDialog
        open={confirmPayment}
        onClose={() => setConfirmPayment(false)}
        onConfirm={recordPayment}
        title="Record Manual Payment"
        message="This will mark the invoice as paid. This action cannot be undone. Are you sure you want to continue?"
        confirmText="Record Payment"
        confirmVariant="primary"
      />

      <ConfirmDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        onConfirm={voidInvoice}
        title="Void Invoice"
        message="This will permanently void this invoice. The customer will no longer be able to pay it. This action cannot be undone."
        confirmText="Void Invoice"
        confirmVariant="danger"
      />
    </div>
  )
}
