import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function getPlaybookAndVerify(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  playbookId: string
) {
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!userData) return { error: 'User not found', status: 404, userData: null, playbook: null }

  const { data: playbook, error } = await supabase
    .from('playbooks')
    .select('id, company_id')
    .eq('id', playbookId)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !playbook)
    return { error: 'Playbook not found', status: 404, userData: null, playbook: null }

  return { error: null, status: 200, userData, playbook }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: playbook, error } = await supabase
    .from('playbooks')
    .select('id, title, category, content, updated_at, created_at')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !playbook)
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })

  return NextResponse.json(playbook)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: verifyError, status: verifyStatus } = await getPlaybookAndVerify(
    supabase,
    user.id,
    params.id
  )

  if (verifyError) {
    return NextResponse.json({ error: verifyError }, { status: verifyStatus })
  }

  let body: { title?: string; category?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.category !== undefined) updates.category = body.category.trim() || null
  if (body.content !== undefined) updates.content = body.content

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('playbooks')
    .update(updates)
    .eq('id', params.id)
    .select('id, title, category, content, updated_at, created_at')
    .single()

  if (error) {
    console.error('Error updating playbook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: verifyError, status: verifyStatus } = await getPlaybookAndVerify(
    supabase,
    user.id,
    params.id
  )

  if (verifyError) {
    return NextResponse.json({ error: verifyError }, { status: verifyStatus })
  }

  const { error } = await supabase.from('playbooks').delete().eq('id', params.id)

  if (error) {
    console.error('Error deleting playbook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
