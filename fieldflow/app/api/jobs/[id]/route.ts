import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function getJobAndVerify(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  jobId: string
) {
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!userData) return { error: 'User not found', status: 404, userData: null, job: null }

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, company_id')
    .eq('id', jobId)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !job) return { error: 'Job not found', status: 404, userData: null, job: null }

  return { error: null, status: 200, userData, job }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      `
      *,
      customers ( id, full_name, phone, email, address, city, state, zip ),
      users!assigned_tech_id ( id, full_name, phone ),
      proposals ( id, proposal_number, line_items, total, deposit_paid, deposit_amount ),
      job_photos ( id, public_url, photo_type, caption, created_at )
    `
    )
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json(job)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: verifyError, status: verifyStatus, userData } = await getJobAndVerify(
    supabase,
    user.id,
    params.id
  )

  if (verifyError || !userData) {
    return NextResponse.json({ error: verifyError }, { status: verifyStatus })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowedFields = [
    'title',
    'description',
    'status',
    'scheduled_start',
    'scheduled_end',
    'assigned_tech_id',
    'address',
    'city',
    'state',
    'zip',
    'internal_notes',
    'line_items',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  // When marking complete, record timestamp
  if (updates.status === 'complete') {
    updates.completed_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: job, error: updateError } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating job:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(job)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: verifyError, status: verifyStatus, userData } = await getJobAndVerify(
    supabase,
    user.id,
    params.id
  )

  if (verifyError || !userData) {
    return NextResponse.json({ error: verifyError }, { status: verifyStatus })
  }

  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', params.id)
    .eq('company_id', userData.company_id)

  if (deleteError) {
    console.error('Error deleting job:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
