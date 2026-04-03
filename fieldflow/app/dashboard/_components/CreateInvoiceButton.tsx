'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CreateInvoiceButtonProps {
  jobId: string
}

export function CreateInvoiceButton({ jobId }: CreateInvoiceButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/create-invoice`, { method: 'POST' })
      const data = await res.json()
      router.push(data.invoiceId ? `/dashboard/invoices/${data.invoiceId}` : '/dashboard/invoices')
    } catch {
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Creating…' : 'Create Invoice →'}
    </button>
  )
}
