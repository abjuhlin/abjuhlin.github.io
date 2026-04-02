import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
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

  let body: { full_name?: string; email?: string; role?: string; phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { full_name, email, role, phone } = body

  // Validate required fields
  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const validRoles = ['owner', 'admin', 'tech']
  const normalizedRole = role || 'tech'
  if (!validRoles.includes(normalizedRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Phone required for technicians
  if (normalizedRole === 'tech' && !phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required for technicians' }, { status: 400 })
  }

  // Check if user already exists in this company
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.trim().toLowerCase())
    .eq('company_id', currentUser.company_id)
    .single()

  if (existingUser) {
    return NextResponse.json(
      { error: 'A team member with this email already exists' },
      { status: 409 }
    )
  }

  const serviceClient = createServiceRoleClient()

  // Send invitation email via Supabase Auth
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: {
        full_name: full_name.trim(),
        company_id: currentUser.company_id,
        role: normalizedRole,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`,
    }
  )

  if (inviteError) {
    console.error('Error inviting user:', inviteError)
    // If user already exists in auth but not in our users table, still proceed
    if (!inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }
  }

  // Create the users record — use the new auth user id if available
  const authUserId = inviteData?.user?.id
  if (authUserId) {
    const { error: insertError } = await serviceClient.from('users').upsert(
      {
        id: authUserId,
        company_id: currentUser.company_id,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: normalizedRole as 'owner' | 'admin' | 'tech',
        phone: phone?.trim() || null,
        is_active: true,
      },
      { onConflict: 'id' }
    )

    if (insertError) {
      console.error('Error creating user record:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Invitation sent to ${email.trim().toLowerCase()}`,
  })
}
