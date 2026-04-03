import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { InvoiceActions } from '@/components/invoices/InvoiceActions'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      line_items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      amount_due,
      deposit_applied,
      due_date,
      paid_at,
      sent_at,
      created_at,
      customers (
        full_name,
        phone,
        email,
        address,
        city,
        state,
        zip
      ),
      jobs (
        id,
        title,
        job_number
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !invoice) notFound()

  const customer = invoice.customers as any
  const job = invoice.jobs as any
  const lineItems: any[] = Array.isArray(invoice.line_items) ? invoice.line_items : []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link + header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-mono">{invoice.invoice_number}</h1>
            {job?.title && (
              <span className="text-gray-500 font-sans font-normal text-base sm:text-lg truncate">{job.title}</span>
            )}
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-2 ml-0 sm:ml-8 flex-wrap">
          {['draft', 'sent', 'overdue'].includes(invoice.status) && (
            <Link href={`/dashboard/invoices/${invoice.id}/edit`} className="btn-secondary text-sm min-h-[44px] flex items-center">
              Edit
            </Link>
          )}
          <Link
            href={`/invoice/${invoice.id}`}
            target="_blank"
            className="btn-secondary text-sm min-h-[44px] flex items-center"
          >
            <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">View client page</span>
            <span className="sm:hidden">Client page</span>
          </Link>
        </div>
      </div>

      {/* Paid banner */}
      {invoice.status === 'paid' && invoice.paid_at && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm font-medium">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Paid on {formatDateTime(invoice.paid_at)}
        </div>
      )}

      {/* Customer info card */}
      <div className="card p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-semibold text-gray-900 text-base">{customer?.full_name || '—'}</div>
            {customer?.phone && (
              <a href={`tel:${customer.phone}`} className="text-gray-600 hover:text-brand transition-colors mt-0.5 block">
                {customer.phone}
              </a>
            )}
            {customer?.email && (
              <a href={`mailto:${customer.email}`} className="text-gray-600 hover:text-brand transition-colors block">
                {customer.email}
              </a>
            )}
          </div>
          {(customer?.address || customer?.city) && (
            <div className="text-gray-600">
              {customer.address && <div>{customer.address}</div>}
              {(customer.city || customer.state || customer.zip) && (
                <div>
                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                  {customer.zip ? ` ${customer.zip}` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job reference */}
      {job && (
        <div className="card p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Reference</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-gray-500">{job.job_number}</span>
            <span className="text-gray-400">—</span>
            <span className="font-medium text-gray-900">{job.title}</span>
          </div>
        </div>
      )}

      {/* Invoice details: dates */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Invoice Date</div>
            <div className="text-gray-900">{formatDate(invoice.created_at)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Due Date</div>
            <div className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-900'}>
              {invoice.due_date ? formatDate(invoice.due_date) : '—'}
            </div>
          </div>
          {invoice.sent_at && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sent</div>
              <div className="text-gray-900">{formatDate(invoice.sent_at)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</h2>
        </div>
        {lineItems.length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-500">No line items.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-5 font-medium text-gray-600">Description</th>
                <th className="text-right py-2 px-4 font-medium text-gray-600">Qty</th>
                <th className="text-right py-2 px-4 font-medium text-gray-600 hidden sm:table-cell">Unit Price</th>
                <th className="text-right py-2 px-5 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-3 px-5 text-gray-900">{item.description}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-600 hidden sm:table-cell">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-5 text-right font-medium text-gray-900">{formatCurrency(item.total ?? item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 px-5 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {(invoice.tax_rate ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax ({invoice.tax_rate}%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Total</span>
            <span className="font-medium text-gray-900">{formatCurrency(invoice.total)}</span>
          </div>
          {(invoice.deposit_applied ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Deposit Applied</span>
              <span className="text-green-600">− {formatCurrency(invoice.deposit_applied)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
            <span>Amount Due</span>
            <span>{formatCurrency(invoice.amount_due)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <InvoiceActions invoiceId={invoice.id} status={invoice.status as any} />
    </div>
  )
}
