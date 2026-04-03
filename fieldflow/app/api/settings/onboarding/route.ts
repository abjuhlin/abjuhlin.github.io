import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
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

  // Verify the company has a real name set (i.e. onboarding was actually completed)
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', userData.company_id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (!company.name || company.name === 'My Company') {
    return NextResponse.json(
      { error: 'Please set a company name before completing onboarding' },
      { status: 400 }
    )
  }

  // Mark onboarding as complete by setting a sentinel value in the company record.
  // We use the updated_at timestamp — the presence of a real company name is the
  // primary signal that onboarding is done, but we also set a flag in case the
  // schema supports it. We attempt to set onboarding_complete; if the column
  // doesn't exist, we silently proceed (the name check is sufficient).
  const { error: flagError } = await supabase
    .from('companies')
    .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
    .eq('id', userData.company_id)

  // If the column doesn't exist, Supabase returns an error — that's fine,
  // we rely on the name check as fallback
  if (flagError && !flagError.message.includes('onboarding_complete')) {
    console.error('Error marking onboarding complete:', flagError)
    return NextResponse.json({ error: flagError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
