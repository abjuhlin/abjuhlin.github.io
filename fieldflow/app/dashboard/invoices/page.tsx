import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue', 'void']

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const activeStatus = searchParams.status || 'all'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Summary stats
  const [{ data: allInvoices }, { data: paidThisMonth }] = await Promise.all([
    supabase.from('invoices').select('amount_due, status').eq('company_id', userData!.company_id),
    supabase.from('invoices').select('total').eq('company_id', userData!.company_id).eq('status', 'paid').gte('paid_at', monthStart),
  ])

  const totalOutstanding = (allInvoices || []).filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.amount_due || 0), 0)
  const totalOverdue = (allInvoices || []).filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount_due || 0), 0)
  const collectedThisMonth = (paidThisMonth || []).reduce((s, i) => s + (i.total || 0), 0)

  // Invoice list
  let query = supabase
    .from('invoices')
    .select('id, invoice_number, status, total, amount_due, due_date, created_at, customers(full_name), jobs(title)')
    .eq('company_id', userData!.company_id)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') query = query.eq('status', activeStatus)
  const { data: invoices } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>Invoices</h1>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outstanding</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-red-500 uppercase tracking-wide">Overdue</div>
          <div className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalOverdue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Collected This Month</div>
          <div className="text-xl font-bold text-green-700 mt-1">{formatCurrency(collectedThisMonth)}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(s => (
          <Link
            key={s}
            href={s === 'all' ? '/dashboard/invoices' : `/dashboard/invoices?status=${s}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${activeStatus === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          }
          title="No invoices yet"
          description="Invoices are created automatically when a job is completed, or you can create one manually."
          action={<Link href="/dashboard/invoices/new" className="btn-primary">Create invoice</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Job</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Total</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Amount Due</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Due Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoices as any[]).map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="block font-mono text-xs text-gray-500">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="block">
                      {inv.customers?.full_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{inv.jobs?.title || '—'}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 hidden sm:table-cell">{formatCurrency(inv.total)}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 hidden sm:table-cell">{formatCurrency(inv.amount_due)}</td>
                  <td className="py-3 px-4 text-gray-500 text-sm hidden lg:table-cell">
                    {inv.due_date ? formatDate(inv.due_date) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            {activeStatus !== 'all' && ` with status "${activeStatus}"`}
          </div>
        </div>
      )}
    </div>
  )
}
