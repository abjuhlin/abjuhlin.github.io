import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch the proposal with full details
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      id,
      title,
      proposal_number,
      status,
      customer_id,
      line_items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      deposit_required,
      deposit_amount,
      notes,
      company_id
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  if (proposal.status !== 'signed') {
    return NextResponse.json({ error: 'Can only create an invoice from a signed proposal' }, { status: 400 })
  }

  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`

  // Calculate balance due: total minus deposit (if deposit was required and collected)
  const depositPaid = proposal.deposit_required ? (proposal.deposit_amount ?? 0) : 0
  const balanceDue = proposal.total - depositPaid

  const lineItems = Array.isArray(proposal.line_items) ? proposal.line_items : []

  // Create the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      company_id: userData.company_id,
      customer_id: proposal.customer_id,
      proposal_id: params.id,
      invoice_number: invoiceNumber,
      title: proposal.title,
      line_items: lineItems,
      subtotal: proposal.subtotal,
      tax_rate: proposal.tax_rate,
      tax_amount: proposal.tax_amount,
      total: proposal.total,
      amount_paid: depositPaid,
      balance_due: balanceDue,
      status: depositPaid > 0 ? 'partial' : 'unpaid',
      notes: proposal.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError)
    return NextResponse.json({ error: invoiceError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, invoiceId: invoice.id })
}
