import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type RouteContext = { params: { id: string } }

async function getAuthorizedCustomer(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, customerId: string, companyId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, company_id')
    .eq('id', customerId)
    .single()

  if (error || !data) return null
  if (data.company_id !== companyId) return null
  return data
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
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

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, address, city, state, zip, notes, created_at, updated_at')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  // Verify this customer belongs to the user's company
  const existing = await getAuthorizedCustomer(supabase, params.id, userData.company_id)
  if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { full_name, phone, email, address, city, state, zip, notes } = body as {
    full_name?: string
    phone?: string
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    notes?: string | null
  }

  // Build update payload with only provided fields
  const updates: Record<string, string | null> = {}

  if (full_name !== undefined) {
    if (typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'full_name cannot be empty' }, { status: 400 })
    }
    updates.full_name = full_name.trim()
  }

  if (phone !== undefined) {
    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'phone cannot be empty' }, { status: 400 })
    }
    updates.phone = phone.trim()
  }

  if (email !== undefined) updates.email = email?.trim() || null
  if (address !== undefined) updates.address = address?.trim() || null
  if (city !== undefined) updates.city = city?.trim() || null
  if (state !== undefined) updates.state = state?.trim() || null
  if (zip !== undefined) updates.zip = zip?.trim() || null
  if (notes !== undefined) updates.notes = notes?.trim() || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
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

  // Verify this customer belongs to the user's company before deleting
  const existing = await getAuthorizedCustomer(supabase, params.id, userData.company_id)
  if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', params.id)
    .eq('company_id', userData.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
