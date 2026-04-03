import { createServiceRoleClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PublicInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()

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
      created_at,
      customers (
        full_name,
        address,
        city,
        state,
        zip
      ),
      company_id
    `)
    .eq('id', params.id)
    .single()

  if (error || !invoice) notFound()

  // Fetch company details separately (service role needed for no-auth public access)
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, phone, email, primary_color')
    .eq('id', invoice.company_id)
    .single()

  const customer = invoice.customers as any
  const lineItems: any[] = Array.isArray(invoice.line_items) ? invoice.line_items : []
  const brandColor = company?.primary_color || '#E86C3A'
  const isPaid = invoice.status === 'paid'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Company Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company?.name || 'Company logo'} className="h-10 w-auto object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: brandColor }}
              >
                {(company?.name || 'F').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{company?.name || 'Your Company'}</div>
              {company?.phone && <div className="text-xs text-gray-500">{company.phone}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-gray-900">{invoice.invoice_number}</div>
            <div className="text-xs text-gray-500">{formatDate(invoice.created_at)}</div>
          </div>
        </div>

        {/* Paid banner */}
        {isPaid && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 font-semibold text-base">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Paid {invoice.paid_at ? `on ${formatDate(invoice.paid_at)}` : ''}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Customer & Due Date */}
          <div className="px-6 py-5 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Bill To</div>
              <div className="font-semibold text-gray-900">{customer?.full_name || '—'}</div>
              {customer?.address && <div className="text-sm text-gray-600 mt-0.5">{customer.address}</div>}
              {(customer?.city || customer?.state || customer?.zip) && (
                <div className="text-sm text-gray-600">
                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                  {customer.zip ? ` ${customer.zip}` : ''}
                </div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Due Date</div>
              <div className={`font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                {invoice.due_date ? formatDate(invoice.due_date) : '—'}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Qty</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Unit Price</th>
                <th className="text-right py-3 px-6 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 px-6 text-center text-gray-400 text-sm">No line items.</td>
                </tr>
              ) : (
                lineItems.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-6 text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-600 hidden sm:table-cell">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-6 text-right font-medium text-gray-900">
                      {formatCurrency(item.total ?? item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-gray-200 px-6 py-5 space-y-2 text-sm">
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
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-3 mt-2">
              <span>Amount Due</span>
              <span style={{ color: isPaid ? '#16a34a' : brandColor }}>{formatCurrency(invoice.amount_due)}</span>
            </div>
          </div>

          {/* Payment section */}
          <div className="border-t border-gray-100 px-6 py-5 bg-gray-50">
            {isPaid ? (
              <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-sm py-1">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Payment received — thank you!
              </div>
            ) : (
              <div className="text-center">
                <button
                  disabled
                  className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white text-sm opacity-60 cursor-not-allowed"
                  style={{ backgroundColor: brandColor }}
                >
                  Contact us to pay
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Online payments coming soon. Please contact us directly to arrange payment.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-400">
          {company?.name && <span>{company.name}</span>}
          {company?.phone && <span> · {company.phone}</span>}
          {company?.email && <span> · {company.email}</span>}
        </div>
      </div>
    </div>
  )
}
