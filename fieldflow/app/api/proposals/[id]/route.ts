import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// GET /api/proposals/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      *,
      customers (
        id,
        full_name,
        phone,
        email,
        address,
        city,
        state,
        zip
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  return NextResponse.json(proposal)
}

// PATCH /api/proposals/[id] — update status or general fields
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    // Allow empty body for simple status transitions
  }

  // Verify the proposal belongs to this company
  const { data: existing } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  // Build update payload — whitelist updatable fields
  const updates: Record<string, any> = {}

  if (body.status) updates.status = body.status
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.message !== undefined) updates.description = body.message
  if (body.terms !== undefined) updates.notes = body.terms
  if (body.line_items !== undefined) updates.line_items = body.line_items
  if (body.subtotal !== undefined) updates.subtotal = body.subtotal
  if (body.tax_rate !== undefined) updates.tax_rate = body.tax_rate
  if (body.tax_amount !== undefined) updates.tax_amount = body.tax_amount
  if (body.total !== undefined) updates.total = body.total
  if (body.deposit_required !== undefined) updates.deposit_required = body.deposit_required
  if (body.deposit_type !== undefined) updates.deposit_type = body.deposit_type
  if (body.deposit_value !== undefined) updates.deposit_value = body.deposit_value
  if (body.deposit_amount !== undefined) updates.deposit_amount = body.deposit_amount
  if (body.valid_until !== undefined) updates.valid_until = body.valid_until

  // Handle "Mark as Declined" — if no status in body and this is a PATCH without body
  // the ProposalActions component calls PATCH with no body on decline
  if (!body.status && Object.keys(updates).length === 0) {
    updates.status = 'declined'
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating proposal:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

// DELETE /api/proposals/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verify ownership
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('Error deleting proposal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
