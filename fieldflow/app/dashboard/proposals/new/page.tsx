'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { CustomerModal } from '@/components/customers/CustomerModal'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Customer {
  id: string
  full_name: string
  phone: string
  email?: string
}

const STEPS = ['Customer', 'Details', 'Line Items', 'Deposit', 'Preview & Send']

export default function NewProposalPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Details
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [terms, setTerms] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
  const [taxRate, setTaxRate] = useState(0)

  // Deposit
  const [depositRequired, setDepositRequired] = useState(false)
  const [depositType, setDepositType] = useState<'percentage' | 'fixed'>('percentage')
  const [depositValue, setDepositValue] = useState(50)

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount
  const depositAmount = depositRequired
    ? depositType === 'percentage' ? total * (depositValue / 100) : depositValue
    : 0

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {})
    fetch('/api/me').then(r => r.json()).then(d => setCompanyId(d?.company_id || '')).catch(() => {})
  }, [])

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  )

  const updateLineItem = (idx: number, field: keyof LineItem, val: string | number) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        updated[idx].total = updated[idx].quantity * updated[idx].unit_price
      }
      return updated
    })
  }

  const addLineItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  const removeLineItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx))

  const canProceed = () => {
    if (step === 0) return !!selectedCustomer
    if (step === 1) return title.trim().length > 0
    if (step === 2) return lineItems.some(i => i.description.trim() && i.total > 0)
    return true
  }

  const handleSubmit = async (send: boolean) => {
    setLoading(true)
    try {
      const body = {
        customer_id: selectedCustomer!.id,
        title,
        message,
        terms,
        line_items: lineItems.filter(i => i.description.trim()),
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        deposit_required: depositRequired,
        deposit_type: depositRequired ? depositType : null,
        deposit_value: depositRequired ? depositValue : 0,
        deposit_amount: depositAmount,
        status: 'draft',
      }
      const res = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create estimate')
      const proposal = await res.json()

      if (send) {
        const sendRes = await fetch(`/api/proposals/${proposal.id}/send`, { method: 'POST' })
        if (!sendRes.ok) toast.error('Estimate created but SMS failed to send')
        else toast.success('Estimate sent!')
      } else {
        toast.success('Estimate saved as draft')
      }
      router.push(`/dashboard/proposals/${proposal.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>New Estimate</h1>
      </div>

      {/* Step progress */}
      <div className="flex items-center mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap
                ${i === step ? 'text-brand' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400'}`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                ${i === step ? 'border-brand bg-brand text-white' : i < step ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {/* Step 0: Customer */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select a Customer</h2>
            <div>
              <label className="label">Search customers</label>
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Type to search..."
                className="input"
              />
            </div>
            {customerSearch && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No customers found</div>
                ) : filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">
                    <div className="font-medium text-gray-900">{c.full_name}</div>
                    <div className="text-gray-500">{c.phone}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="font-medium text-green-900">{selectedCustomer.full_name}</div>
                  <div className="text-sm text-green-700">{selectedCustomer.phone}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-green-600 hover:text-green-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <button onClick={() => setShowCustomerModal(true)} className="text-sm text-brand hover:underline">
              + Create new customer
            </button>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Estimate Details</h2>
            <div>
              <label className="label">Estimate Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. HVAC Tune-Up and Filter Replacement" className="input" />
            </div>
            <div>
              <label className="label">Intro message to client <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                placeholder="Thanks for reaching out — here's your quote..." className="input" />
            </div>
            <div>
              <label className="label">Terms and conditions <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4}
                placeholder="Payment due upon completion..." className="input" />
            </div>
          </div>
        )}

        {/* Step 2: Line Items */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 font-medium text-gray-600">Description</th>
                    <th className="text-center pb-2 font-medium text-gray-600 w-20">Qty</th>
                    <th className="text-right pb-2 font-medium text-gray-600 w-28">Unit Price</th>
                    <th className="text-right pb-2 font-medium text-gray-600 w-28">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2">
                        <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)}
                          placeholder="Service description" className="input text-sm min-h-[36px]" />
                      </td>
                      <td className="py-2 px-1">
                        <input type="number" min="0" step="0.5" value={item.quantity}
                          onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="input text-center text-sm min-h-[36px]" />
                      </td>
                      <td className="py-2 px-1">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" min="0" step="0.01" value={item.unit_price}
                            onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="input pl-6 text-right text-sm min-h-[36px]" />
                        </div>
                      </td>
                      <td className="py-2 pl-1 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                      <td className="py-2 pl-1">
                        <button onClick={() => removeLineItem(i)} disabled={lineItems.length === 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addLineItem} className="text-sm text-brand hover:underline">+ Add line item</button>
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Tax rate</span>
                  <div className="relative w-20">
                    <input type="number" min="0" max="100" step="0.5" value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="input pr-6 text-sm min-h-[32px] py-1" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-2">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Deposit */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Deposit Settings</h2>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Require deposit at signing</div>
                <div className="text-sm text-gray-500">Client must pay a deposit when they sign the estimate</div>
              </div>
              <button
                onClick={() => setDepositRequired(!depositRequired)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${depositRequired ? 'bg-brand' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${depositRequired ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {depositRequired && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-4">
                  {(['percentage', 'fixed'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="depositType" checked={depositType === type} onChange={() => setDepositType(type)} />
                      <span className="text-sm font-medium">{type === 'percentage' ? 'Percentage of total' : 'Fixed amount'}</span>
                    </label>
                  ))}
                </div>
                <div className="relative w-32">
                  {depositType === 'fixed' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>}
                  <input
                    type="number" min="0" value={depositValue}
                    onChange={e => setDepositValue(parseFloat(e.target.value) || 0)}
                    className={`input ${depositType === 'fixed' ? 'pl-6' : ''} ${depositType === 'percentage' ? 'pr-7' : ''}`}
                  />
                  {depositType === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>}
                </div>
                <div className="p-3 bg-brand/10 rounded-lg text-sm font-medium text-brand">
                  Client will pay {formatCurrency(depositAmount)} when they sign
                </div>
                <p className="text-sm text-gray-500 italic">Deposit will be collected separately.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Preview &amp; Send</h2>
            <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-gray-50">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>{title}</h3>
                {message && <p className="text-gray-600 mt-2 text-sm">{message}</p>}
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">For: {selectedCustomer?.full_name}</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left pb-1 font-medium text-gray-600">Description</th>
                    <th className="text-center pb-1 font-medium text-gray-600">Qty</th>
                    <th className="text-right pb-1 font-medium text-gray-600">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.filter(i => i.description.trim()).map((item, i) => (
                      <tr key={i}><td className="py-1.5">{item.description}</td><td className="py-1.5 text-center">{item.quantity}</td><td className="py-1.5 text-right">{formatCurrency(item.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {taxRate > 0 && <div className="flex justify-between text-gray-600"><span>Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
                {depositRequired && (
                  <>
                    <div className="flex justify-between text-brand font-medium pt-1 border-t border-dashed border-brand/30">
                      <span>Deposit due at signing</span><span>{formatCurrency(depositAmount)}</span>
                    </div>
                    <p className="text-xs text-gray-500 italic">Deposit will be collected separately.</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSubmit(false)} disabled={loading} className="btn-secondary flex-1">
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button onClick={() => handleSubmit(true)} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Sending...' : 'Send to Client'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between mt-6">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn-secondary disabled:opacity-0">
            ← Back
          </button>
          <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-primary">
            Continue →
          </button>
        </div>
      )}

      {showCustomerModal && (
        <CustomerModal
          companyId={companyId}
          onClose={() => setShowCustomerModal(false)}
          onSuccess={(newCustomer?: any) => {
            setShowCustomerModal(false)
            if (newCustomer) {
              setCustomers(prev => [...prev, newCustomer])
              setSelectedCustomer(newCustomer)
            }
          }}
        />
      )}
    </div>
  )
}
