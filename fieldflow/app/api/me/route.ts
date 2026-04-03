import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error } = await supabase
    .from('users')
    .select('id, company_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (error || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: userData.id,
    company_id: userData.company_id,
    role: userData.role,
    full_name: userData.full_name,
  })
}
