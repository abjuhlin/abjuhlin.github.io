import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
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

  const { data: company, error } = await supabase
    .from('companies')
    .select(
      'id, name, phone, email, logo_url, primary_color, proposal_footer, invoice_footer, google_review_url, review_request_delay_hours, notify_dispatch_sms, notify_24h_reminder, notify_1h_reminder, notify_review_request'
    )
    .eq('id', userData.company_id)
    .single()

  if (error || !company) {
    console.error('Error fetching company settings:', error)
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json(company)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!['owner', 'admin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields = [
    'name',
    'phone',
    'email',
    'primary_color',
    'proposal_footer',
    'invoice_footer',
    'google_review_url',
    'review_request_delay_hours',
    'notify_dispatch_sms',
    'notify_24h_reminder',
    'notify_1h_reminder',
    'notify_review_request',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', userData.company_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating company settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
