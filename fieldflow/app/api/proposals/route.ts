import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('proposals')
    .select(
      `
      id,
      title,
      subtotal,
      tax_amount,
      total,
      status,
      sent_at,
      signed_at,
      viewed_at,
      created_at,
      proposal_number,
      customers (
        id,
        full_name,
        phone,
        email
      )
    `
    )
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: proposals, error } = await query

  if (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 })
  }

  return NextResponse.json(proposals)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    customer_id,
    title,
    message,
    terms,
    line_items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    deposit_required,
    deposit_type,
    deposit_value,
    deposit_amount,
    status = 'draft',
  } = body

  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Generate proposal number
  const { count } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)

  const proposalNumber = `PRO-${String((count ?? 0) + 1).padStart(4, '0')}`

  const insertData: any = {
    company_id: userData.company_id,
    customer_id,
    title,
    message: message ?? null,
    terms: terms ?? null,
    line_items: line_items ?? [],
    subtotal: subtotal ?? 0,
    tax_rate: tax_rate ?? 0,
    tax_amount: tax_amount ?? 0,
    total: total ?? 0,
    status,
    deposit_required: deposit_required ?? false,
    deposit_type: deposit_type ?? null,
    deposit_value: deposit_value ?? 0,
    deposit_amount: deposit_amount ?? 0,
    proposal_number: proposalNumber,
  }

  if (status === 'sent') {
    insertData.sent_at = new Date().toISOString()
  }

  const { data: proposal, error: insertError } = await supabase
    .from('proposals')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    console.error('Error creating proposal:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(proposal, { status: 201 })
}
