import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!['owner', 'admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Verify the target user belongs to the same company
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('id', params.id)
    .eq('company_id', currentUser.company_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  let body: { role?: string; phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.role !== undefined) {
    const validRoles = ['owner', 'admin', 'tech']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    updates.role = body.role
  }
  if (body.phone !== undefined) {
    updates.phone = body.phone.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', params.id)
    .select('id, full_name, email, role, phone')
    .single()

  if (error) {
    console.error('Error updating team member:', error)
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

  // Cannot delete yourself
  if (params.id === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!['owner', 'admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Verify target user belongs to same company
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('id', params.id)
    .eq('company_id', currentUser.company_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  // Cannot delete last owner
  if (targetUser.role === 'owner') {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', currentUser.company_id)
      .eq('role', 'owner')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last owner of the company' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
