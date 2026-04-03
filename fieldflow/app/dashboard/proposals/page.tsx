import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUSES = ['all', 'draft', 'sent', 'viewed', 'signed', 'declined', 'expired']

export default async function ProposalsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  const activeStatus = searchParams.status || 'all'

  let query = supabase
    .from('proposals')
    .select('id, proposal_number, title, total, status, created_at, sent_at, customers(full_name)')
    .eq('company_id', userData!.company_id)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }

  const { data: proposals } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>Estimates</h1>
        <Link href="/dashboard/proposals/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Estimate
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/dashboard/proposals' : `/dashboard/proposals?status=${s}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${activeStatus === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {!proposals || proposals.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          title="No estimates yet"
          description="Create your first estimate to start sending quotes to clients."
          action={<Link href="/dashboard/proposals/new" className="btn-primary">Create your first estimate</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Title</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Total</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proposals.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/proposals/${p.id}`} className="block font-mono text-xs text-gray-500">{p.proposal_number}</Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/proposals/${p.id}`} className="block font-medium text-gray-900">{p.customers?.full_name}</Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                    <Link href={`/dashboard/proposals/${p.id}`} className="block">{p.title}</Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900 hidden sm:table-cell">{formatCurrency(p.total)}</td>
                  <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
