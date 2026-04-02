'use client'
import { useEffect, useRef, useState } from 'react'
import { createServiceRoleClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

// This component fetches data client-side via the API to keep it public-friendly.
// The actual signing and viewing is handled via API calls.

interface ProposalData {
  id: string
  proposal_number: string
  title: string
  description: string | null
  notes: string | null
  line_items: any[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_required: boolean
  deposit_type: string | null
  deposit_value: number | null
  deposit_amount: number | null
  status: string
  signed_at: string | null
  customers: {
    full_name: string
    phone: string
    email?: string
  } | null
  companies: {
    name: string
    logo_url?: string
    primary_color?: string
    phone?: string
    email?: string
  } | null
}

function SignatureCanvas({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      lastPos.current = getPos(e, canvas)
    }
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!drawing.current || !lastPos.current) return
      const pos = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPos.current = pos
    }
    const end = () => {
      drawing.current = false
      lastPos.current = null
      onSign(canvas.toDataURL())
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [onSign])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onSign('')
  }

  return (
    <div>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full touch-none cursor-crosshair"
          style={{ maxHeight: '160px' }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400">Draw your signature above</p>
        <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-700 underline">
          Clear
        </button>
      </div>
    </div>
  )
}

export default function PublicProposalPage({ params }: { params: { id: string } }) {
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await fetch(`/api/proposals/${params.id}/public`)
        if (!res.ok) {
          setError('This proposal could not be found or has expired.')
          return
        }
        const data = await res.json()
        setProposal(data)

        // Mark as viewed if status is 'sent'
        if (data.status === 'sent') {
          fetch(`/api/proposals/${params.id}/view`, { method: 'POST' }).catch(() => {})
        }
      } catch {
        setError('Failed to load proposal.')
      } finally {
        setLoading(false)
      }
    }
    fetchProposal()
  }, [params.id])

  const handleSign = async () => {
    if (!signature || !agreed) return
    setSigning(true)
    try {
      const res = await fetch(`/api/proposals/${params.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true, signature }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Signing failed')
      setSigned(true)
      setProposal(prev => prev ? { ...prev, status: 'signed', signed_at: new Date().toISOString() } : prev)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error && !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposal Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!proposal) return null

  const lineItems: any[] = Array.isArray(proposal.line_items) ? proposal.line_items : []
  const company = proposal.companies
  const brandColor = company?.primary_color || '#E86C3A'
  const isAlreadySigned = proposal.status === 'signed' || proposal.status === 'declined' || proposal.status === 'expired'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Company header */}
        <div className="text-center mb-8">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-12 mx-auto mb-3 object-contain" />
          ) : (
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold text-xl mx-auto mb-3"
              style={{ backgroundColor: brandColor }}
            >
              {company?.name?.charAt(0) ?? 'F'}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-800">{company?.name}</h2>
          {company?.phone && <p className="text-sm text-gray-500">{company.phone}</p>}
          {company?.email && <p className="text-sm text-gray-500">{company.email}</p>}
        </div>

        {/* Already signed banner */}
        {isAlreadySigned && proposal.status === 'signed' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 text-green-800 font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              This proposal has been signed
            </div>
            {proposal.signed_at && (
              <p className="text-green-600 text-sm mt-1">on {formatDate(proposal.signed_at)}</p>
            )}
          </div>
        )}

        {proposal.status === 'declined' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-700 font-medium">This proposal has been declined.</p>
          </div>
        )}

        {proposal.status === 'expired' && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
            <p className="text-orange-700 font-medium">This proposal has expired.</p>
          </div>
        )}

        {/* Proposal card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Color bar */}
          <div className="h-2" style={{ backgroundColor: brandColor }} />

          <div className="p-8 space-y-6">
            {/* Title & recipient */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl font-bold text-gray-900 mb-1"
                    style={{ fontFamily: 'DM Serif Display, serif' }}
                  >
                    {proposal.title}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Proposal {proposal.proposal_number} &middot; For {proposal.customers?.full_name}
                  </p>
                </div>
              </div>
              {proposal.description && (
                <p className="text-gray-600 mt-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {proposal.description}
                </p>
              )}
            </div>

            {/* Line items */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left pb-2 font-semibold text-gray-700">Description</th>
                    <th className="text-center pb-2 font-semibold text-gray-700 w-16">Qty</th>
                    <th className="text-right pb-2 font-semibold text-gray-700 w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lineItems.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 text-gray-800">{item.description}</td>
                      <td className="py-3 text-center text-gray-500">{item.quantity}</td>
                      <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(proposal.subtotal)}</span>
                </div>
                {proposal.tax_rate > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({proposal.tax_rate}%)</span>
                    <span>{formatCurrency(proposal.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(proposal.total)}</span>
                </div>
                {proposal.deposit_required && proposal.deposit_amount != null && (
                  <div
                    className="flex justify-between text-sm font-semibold pt-2 border-t border-dashed"
                    style={{ color: brandColor, borderColor: brandColor + '40' }}
                  >
                    <span>Deposit due at signing</span>
                    <span>{formatCurrency(proposal.deposit_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit note */}
            {proposal.deposit_required && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{ backgroundColor: brandColor + '10', color: brandColor }}
              >
                <p className="font-medium">Deposit Required: {formatCurrency(proposal.deposit_amount ?? 0)}</p>
                <p className="mt-1 text-gray-500 font-normal">Deposit will be collected separately.</p>
              </div>
            )}

            {/* Terms */}
            {proposal.notes && (
              <div className="text-sm text-gray-600 border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-700 mb-1">Terms &amp; Conditions</p>
                <p className="whitespace-pre-wrap leading-relaxed">{proposal.notes}</p>
              </div>
            )}
          </div>

          {/* Signature section */}
          {!isAlreadySigned && !signed && (
            <div className="border-t border-gray-200 p-8 space-y-5 bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Sign this Proposal</h3>

              <SignatureCanvas onSign={setSignature} />

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  I have read and agree to the terms of this proposal. I understand that signing this proposal
                  constitutes a legal agreement to proceed with the work described above.
                </span>
              </label>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleSign}
                disabled={!signature || !agreed || signing}
                className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColor }}
              >
                {signing ? 'Signing...' : 'Sign Proposal'}
              </button>
            </div>
          )}

          {/* Success state */}
          {signed && (
            <div className="border-t border-gray-200 p-8 bg-green-50 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Proposal Signed!</h3>
              <p className="text-green-700 text-sm">
                Thank you, {proposal.customers?.full_name}. The team will be in touch shortly about your deposit.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by FieldFlow &mdash; {company?.name}
        </p>
      </div>
    </div>
  )
}
