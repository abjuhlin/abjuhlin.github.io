import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddCustomerButton } from '@/components/customers/AddCustomerButton'

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user!.id)
    .single()

  let query = supabase
    .from('customers')
    .select('id, full_name, email, phone, city, state, created_at')
    .eq('company_id', userData!.company_id)
    .order('created_at', { ascending: false })

  if (searchParams.q) {
    query = query.or(
      `full_name.ilike.%${searchParams.q}%,phone.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`
    )
  }

  const { data: customers } = await query

  // Get job counts for all customers in this company
  const { data: jobCounts } = await supabase
    .from('jobs')
    .select('customer_id')
    .eq('company_id', userData!.company_id)

  const countMap = (jobCounts || []).reduce((acc: Record<string, number>, j) => {
    acc[j.customer_id] = (acc[j.customer_id] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Customers
        </h1>
        <AddCustomerButton companyId={userData!.company_id} />
      </div>

      {/* Search */}
      <form method="GET" className="mb-4">
        <div className="relative max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
          </div>
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search by name, phone, or email..."
            className="input pl-9"
          />
        </div>
      </form>

      {!customers || customers.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          title={searchParams.q ? 'No customers found' : 'No customers yet'}
          description={
            searchParams.q
              ? `No customers match "${searchParams.q}". Try a different search.`
              : 'Add your first customer to get started.'
          }
          action={
            searchParams.q ? (
              <Link href="/dashboard/customers" className="btn-secondary text-sm">
                Clear search
              </Link>
            ) : (
              <AddCustomerButton companyId={userData!.company_id} />
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                  Phone
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                  Email
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">
                  Location
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                  Jobs
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/customers/${customer.id}`} className="block">
                      <span className="font-medium text-gray-900">{customer.full_name}</span>
                      <span className="block sm:hidden text-gray-500 text-xs mt-0.5">
                        {customer.phone}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                    {customer.phone || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                    {customer.email || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                    {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      {countMap[customer.id] || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                    {formatDate(customer.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
            {searchParams.q && ` matching "${searchParams.q}"`}
          </div>
        </div>
      )}
    </div>
  )
}
