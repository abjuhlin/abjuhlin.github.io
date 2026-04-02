import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type RouteContext = { params: { id: string } }

async function getAuthorizedInvoice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invoiceId: string,
  companyId: string
) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, company_id, status')
    .eq('id', invoiceId)
    .single()

  if (error || !data) return null
  if (data.company_id !== companyId) return null
  return data
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

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
      updated_at,
      notes,
      customers (
        id,
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

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  return NextResponse.json(invoice)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await getAuthorizedInvoice(supabase, params.id, userData.company_id)
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = [
    'status',
    'line_items',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'total',
    'amount_due',
    'deposit_applied',
    'due_date',
    'paid_at',
    'sent_at',
    'notes',
    'job_id',
  ]

  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key]
    }
  }

  // Validate status if being updated
  const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'void']
  if (updates.status && !validStatuses.includes(updates.status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  // If marking as paid and no paid_at provided, set it now
  if (updates.status === 'paid' && !updates.paid_at) {
    updates.paid_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: invoice, error: updateError } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating invoice:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(invoice)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await getAuthorizedInvoice(supabase, params.id, userData.company_id)
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Prevent deleting paid invoices
  if (existing.status === 'paid') {
    return NextResponse.json({ error: 'Cannot delete a paid invoice. Void it instead.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', params.id)
    .eq('company_id', userData.company_id)

  if (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
