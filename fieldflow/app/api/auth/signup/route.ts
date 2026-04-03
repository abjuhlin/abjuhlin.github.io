import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, companyName, fullName } = await request.json()

    if (!userId || !email || !companyName || !fullName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Create company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        email,
        primary_color: '#E86C3A',
        review_request_delay_hours: 4,
        notify_dispatch: true,
        notify_reminder_24h: true,
        notify_reminder_1h: true,
        notify_review_request: true,
      })
      .select('id')
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }

    // Create user record linking auth user to company
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      company_id: company.id,
      email,
      full_name: fullName,
      role: 'owner',
    })

    if (userError) {
      // Clean up company if user record fails
      await supabase.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, companyId: company.id })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
