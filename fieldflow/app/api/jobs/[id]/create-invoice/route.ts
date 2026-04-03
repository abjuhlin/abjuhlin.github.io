import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch the job with proposal details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(
      `
      id,
      job_number,
      title,
      description,
      company_id,
      customer_id,
      proposal_id,
      line_items,
      proposals (
        id,
        line_items,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        deposit_paid,
        deposit_amount
      )
    `
    )
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Check if invoice already exists for this job
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('job_id', params.id)
    .maybeSingle()

  if (existingInvoice) {
    return NextResponse.json({ invoiceId: existingInvoice.id, existing: true })
  }

  // Determine line items: prefer proposal line items, fall back to job line items
  const proposal = Array.isArray((job as any).proposals)
    ? (job as any).proposals[0]
    : (job as any).proposals

  let lineItems: any[] = []
  let subtotal = 0
  let taxRate = 0
  let taxAmount = 0
  let total = 0
  let depositApplied = 0

  if (proposal && Array.isArray(proposal.line_items) && proposal.line_items.length > 0) {
    lineItems = proposal.line_items
    subtotal = Number(proposal.subtotal ?? 0)
    taxRate = Number(proposal.tax_rate ?? 0)
    taxAmount = Number(proposal.tax_amount ?? 0)
    total = Number(proposal.total ?? 0)

    // Apply deposit if it was paid
    if (proposal.deposit_paid && Number(proposal.deposit_amount) > 0) {
      depositApplied = Number(proposal.deposit_amount)
    }
  } else if (Array.isArray((job as any).line_items) && (job as any).line_items.length > 0) {
    lineItems = (job as any).line_items
    subtotal = lineItems.reduce((sum: number, li: any) => sum + Number(li.total ?? 0), 0)
    total = subtotal
  }

  const amountDue = Math.max(0, total - depositApplied)

  // Generate invoice number
  const { data: invoiceNumber, error: seqError } = await supabase.rpc('generate_invoice_number', {
    company_id: userData.company_id,
  })

  if (seqError || !invoiceNumber) {
    console.error('Error generating invoice number:', seqError)
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
  }

  // Set due date 30 days from now
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert({
      company_id: userData.company_id,
      customer_id: job.customer_id,
      job_id: job.id,
      invoice_number: invoiceNumber,
      status: 'draft',
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      amount_due: amountDue,
      deposit_applied: depositApplied,
      due_date: dueDate.toISOString().split('T')[0],
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating invoice:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark job as invoiced
  await supabase
    .from('jobs')
    .update({ status: 'invoiced' })
    .eq('id', params.id)
    .eq('company_id', userData.company_id)

  return NextResponse.json({ invoiceId: invoice.id }, { status: 201 })
}
