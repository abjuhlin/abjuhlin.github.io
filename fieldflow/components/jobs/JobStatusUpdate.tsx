'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const STATUS_FLOW = ['scheduled', 'en_route', 'in_progress', 'complete'] as const

export function JobStatusUpdate({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const router = useRouter()

  const currentIdx = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number])
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIdx + 1]
    : null

  const labels: Record<string, string> = {
    scheduled: 'Mark En Route',
    en_route: 'Mark In Progress',
    in_progress: 'Mark Complete',
  }

  const advance = async () => {
    if (!nextStatus) return
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      if (nextStatus === 'complete') {
        toast.success('Job complete! Creating invoice...')
        await createInvoice()
      } else {
        toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`)
        router.refresh()
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const createInvoice = async () => {
    setInvoiceLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/create-invoice`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice')
      if (data.invoiceId) {
        router.push(`/dashboard/invoices/${data.invoiceId}`)
      }
    } catch (e: any) {
      toast.error(e.message)
      setInvoiceLoading(false)
    }
  }

  if (currentStatus === 'cancelled') {
    return (
      <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium text-center">
        This job has been cancelled
      </div>
    )
  }

  if (currentStatus === 'complete' || currentStatus === 'invoiced' || currentStatus === 'paid') {
    return (
      <div className="space-y-3">
        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 font-medium text-center">
          Job complete
        </div>
        {currentStatus === 'complete' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-3">
              Invoice not yet created
            </p>
            <button
              onClick={createInvoice}
              disabled={invoiceLoading}
              className="btn-primary w-full text-sm"
            >
              {invoiceLoading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {nextStatus && (
        <button onClick={advance} disabled={loading} className="btn-primary w-full">
          {loading ? 'Updating...' : labels[currentStatus] || 'Update Status'}
        </button>
      )}
    </div>
  )
}
