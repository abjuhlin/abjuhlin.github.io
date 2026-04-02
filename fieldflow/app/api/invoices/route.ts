import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const jobId = searchParams.get('job_id')

  let query = supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      total,
      amount_due,
      due_date,
      paid_at,
      sent_at,
      created_at,
      customers (
        id,
        full_name,
        phone,
        email
      ),
      jobs (
        id,
        title,
        job_number
      )
    `)
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (customerId) query = query.eq('customer_id', customerId)
  if (jobId) query = query.eq('job_id', jobId)

  const { data: invoices, error } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }

  return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    customer_id,
    job_id,
    line_items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    deposit_applied,
    amount_due,
    due_date,
    status = 'draft',
    notes,
  } = body

  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
  }
  if (!Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  // Verify customer belongs to this company
  const { data: customerCheck } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customer_id)
    .eq('company_id', userData.company_id)
    .single()

  if (!customerCheck) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // If job_id provided, verify it belongs to this company
  if (job_id) {
    const { data: jobCheck } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job_id)
      .eq('company_id', userData.company_id)
      .single()

    if (!jobCheck) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
  }

  // Generate invoice number using the DB function
  const { data: numberData, error: numberError } = await supabase
    .rpc('generate_invoice_number', { company_id: userData.company_id })

  let invoiceNumber: string
  if (numberError || !numberData) {
    // Fallback: count existing invoices and pad
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)
    invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`
  } else {
    invoiceNumber = numberData as string
  }

  const insertData: any = {
    company_id: userData.company_id,
    customer_id,
    job_id: job_id || null,
    invoice_number: invoiceNumber,
    status,
    line_items: line_items,
    subtotal: subtotal ?? 0,
    tax_rate: tax_rate ?? 0,
    tax_amount: tax_amount ?? 0,
    total: total ?? 0,
    deposit_applied: deposit_applied ?? 0,
    amount_due: amount_due ?? total ?? 0,
    due_date: due_date || null,
    notes: notes ?? null,
  }

  if (status === 'sent') {
    insertData.sent_at = new Date().toISOString()
  }

  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    console.error('Error creating invoice:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(invoice, { status: 201 })
}
