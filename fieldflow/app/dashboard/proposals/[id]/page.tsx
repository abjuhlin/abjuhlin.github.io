import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProposalActions } from '@/components/proposals/ProposalActions'

export default async function ProposalDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      *,
      customers (
        id,
        full_name,
        phone,
        email,
        address,
        city,
        state,
        zip
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData!.company_id)
    .single()

  if (!proposal) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, primary_color, phone, email, address, city, state, zip')
    .eq('id', userData!.company_id)
    .single()

  // Check if a job already exists for this proposal
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id')
    .eq('proposal_id', params.id)
    .maybeSingle()

  const hasJob = !!existingJob

  const customer = proposal.customers as any
  const lineItems: any[] = Array.isArray(proposal.line_items) ? proposal.line_items : []

  // Timeline steps
  const timeline = [
    { label: 'Created', date: proposal.created_at, done: true },
    { label: 'Sent', date: proposal.sent_at, done: !!proposal.sent_at },
    { label: 'Viewed', date: proposal.viewed_at, done: !!proposal.viewed_at },
    { label: 'Signed', date: proposal.signed_at, done: !!proposal.signed_at },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/proposals" className="text-sm text-gray-500 hover:text-gray-700">← Proposals</Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {proposal.proposal_number}
            </h1>
            <StatusBadge status={proposal.status} />
          </div>
          <p className="text-gray-600 mt-0.5">{proposal.title}</p>
          <p className="text-sm text-gray-500">{customer?.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/proposal/${params.id}`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Client Page
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: proposal content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status timeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Status Timeline</h2>
            <div className="flex items-start gap-0">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex-1 flex flex-col items-center relative">
                  {i < timeline.length - 1 && (
                    <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${step.done && timeline[i + 1].done ? 'bg-green-400' : step.done ? 'bg-green-200' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold
                    ${step.done ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                    {step.done ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-xs font-medium ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</div>
                    {step.date && (
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(step.date)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signed info */}
          {proposal.status === 'signed' && proposal.signed_at && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
              <div className="font-medium text-green-800">Signed on {formatDateTime(proposal.signed_at)}</div>
              {proposal.signed_ip && (
                <div className="text-green-600 text-xs mt-0.5">IP address: {proposal.signed_ip}</div>
              )}
            </div>
          )}

          {/* Intro message */}
          {(proposal.description || proposal.notes) && (
            <div className="card p-5 space-y-4">
              {proposal.description && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Message</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.description}</p>
                </div>
              )}
              {proposal.notes && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Terms &amp; Conditions</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase">Line Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-5 font-medium text-gray-600">Description</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-600 w-20">Qty</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600 w-28">Unit Price</th>
                  <th className="text-right py-3 px-5 font-medium text-gray-600 w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-3 px-5 text-gray-800">{item.description}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-5 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-2">
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
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(proposal.total)}</span>
              </div>
              {proposal.deposit_required && (
                <div className="flex justify-between text-sm font-medium text-brand border-t border-dashed border-brand/30 pt-2">
                  <span>Deposit ({proposal.deposit_type === 'percentage' ? `${proposal.deposit_value}%` : 'Fixed'})</span>
                  <span>{formatCurrency(proposal.deposit_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deposit info */}
          {proposal.deposit_required && (
            <div className="p-4 bg-brand/5 border border-brand/20 rounded-lg">
              <div className="text-sm font-medium text-brand mb-1">Deposit Required</div>
              <div className="text-sm text-gray-700">
                {formatCurrency(proposal.deposit_amount)} due at signing.
              </div>
              <p className="text-xs text-gray-500 mt-1 italic">Deposit will be collected separately.</p>
            </div>
          )}

          {/* Activity log */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Activity</h2>
            <div className="space-y-3">
              {proposal.signed_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800">Proposal signed</span>
                    <span className="text-gray-500 ml-2">{formatDateTime(proposal.signed_at)}</span>
                  </div>
                </div>
              )}
              {proposal.viewed_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800">Proposal viewed</span>
                    <span className="text-gray-500 ml-2">{formatDateTime(proposal.viewed_at)}</span>
                  </div>
                </div>
              )}
              {proposal.sent_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800">Proposal sent</span>
                    <span className="text-gray-500 ml-2">{formatDateTime(proposal.sent_at)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-800">Proposal created</span>
                  <span className="text-gray-500 ml-2">{formatDateTime(proposal.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: customer info + actions */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Actions</h2>
            <ProposalActions proposalId={params.id} status={proposal.status} hasJob={hasJob} />
          </div>

          {/* Customer info */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Customer</h2>
            <div className="space-y-2">
              <div>
                <Link href={`/dashboard/customers/${customer?.id}`} className="font-medium text-gray-900 hover:text-brand">
                  {customer?.full_name}
                </Link>
              </div>
              {customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${customer.phone}`} className="hover:text-brand">{customer.phone}</a>
                </div>
              )}
              {customer?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${customer.email}`} className="hover:text-brand">{customer.email}</a>
                </div>
              )}
              {(customer?.address || customer?.city) && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {customer.address && <>{customer.address}<br /></>}
                    {[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Proposal meta */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Proposal #</dt>
                <dd className="font-mono text-gray-700">{proposal.proposal_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-700">{formatDate(proposal.created_at)}</dd>
              </div>
              {proposal.valid_until && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Valid until</dt>
                  <dd className="text-gray-700">{formatDate(proposal.valid_until)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-semibold text-gray-900">{formatCurrency(proposal.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
