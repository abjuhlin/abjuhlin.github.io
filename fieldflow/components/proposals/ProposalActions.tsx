'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export function ProposalActions({ proposalId, status, hasJob }: { proposalId: string; status: string; hasJob: boolean }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const call = async (url: string, method = 'POST', label = '') => {
    setLoading(label)
    try {
      const res = await fetch(url, { method })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const data = await res.json()
      toast.success('Done!')
      router.refresh()
      return data
    } catch (e: any) {
      toast.error(e.message)
      return null
    } finally {
      setLoading(null)
    }
  }

  if (status === 'draft') return (
    <div className="space-y-2">
      <Link href={`/dashboard/proposals/${proposalId}/edit`} className="btn-secondary w-full text-center">
        Edit Estimate
      </Link>
      <button onClick={() => call(`/api/proposals/${proposalId}/send`, 'POST', 'send')} disabled={loading === 'send'} className="btn-primary w-full">
        {loading === 'send' ? 'Sending...' : 'Send to Client'}
      </button>
    </div>
  )

  if (status === 'sent' || status === 'viewed') return (
    <div className="space-y-2">
      <button onClick={() => call(`/api/proposals/${proposalId}/send`, 'POST', 'resend')} disabled={!!loading} className="btn-secondary w-full">
        {loading === 'resend' ? 'Sending...' : 'Resend'}
      </button>
      <button
        onClick={() => call(`/api/proposals/${proposalId}`, 'PATCH', 'decline').then(() => router.refresh())}
        disabled={!!loading}
        className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
      >
        Mark as Declined
      </button>
    </div>
  )

  if (status === 'signed') return (
    <div className="space-y-2">
      {!hasJob && (
        <button onClick={async () => {
          const data = await call(`/api/proposals/${proposalId}/create-job`, 'POST', 'job')
          if (data?.jobId) router.push(`/dashboard/jobs/${data.jobId}`)
        }} disabled={!!loading} className="btn-primary w-full">
          {loading === 'job' ? 'Creating...' : 'Create Job'}
        </button>
      )}
      <button onClick={async () => {
        const data = await call(`/api/proposals/${proposalId}/create-invoice`, 'POST', 'invoice')
        if (data?.invoiceId) router.push(`/dashboard/invoices/${data.invoiceId}`)
      }} disabled={!!loading} className="btn-secondary w-full">
        {loading === 'invoice' ? 'Creating...' : 'Create Invoice'}
      </button>
    </div>
  )

  return null
}
