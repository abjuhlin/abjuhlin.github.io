import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CustomerTabs } from './CustomerTabs'
import { CustomerEditButton } from './CustomerEditButton'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const [{ data: customer }, { data: proposals }, { data: jobs }, { data: invoices }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', params.id)
        .eq('company_id', userData!.company_id)
        .single(),
      supabase
        .from('proposals')
        .select('id, proposal_number, title, total, status, created_at')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select('id, job_number, title, status, scheduled_start')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, total, amount_due, status, due_date')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false }),
    ])

  if (!customer) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/customers"
            className="text-sm text-gray-500 hover:text-brand mb-1 block"
          >
            ← Customers
          </Link>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            {customer.full_name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <CustomerEditButton customerId={customer.id} companyId={userData!.company_id} />
          <Link
            href={`/dashboard/jobs/new?customer=${customer.id}`}
            className="btn-primary"
          >
            New Job
          </Link>
        </div>
      </div>
      <CustomerTabs
        customer={customer}
        proposals={proposals || []}
        jobs={jobs || []}
        invoices={invoices || []}
      />
    </div>
  )
}
