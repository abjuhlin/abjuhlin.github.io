import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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
    .select('id, full_name, email, phone, city, state, zip, address, notes, created_at')
    .eq('company_id', userData.company_id)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Whitelist allowed fields
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

  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      company_id: userData.company_id,
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
