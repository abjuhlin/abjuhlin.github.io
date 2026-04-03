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

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const q = searchParams.get('q')

  let query = supabase
    .from('playbooks')
    .select('id, title, category, content, updated_at, created_at')
    .eq('company_id', userData.company_id)
    .order('updated_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching playbooks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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

  let body: { title?: string; category?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, category, content } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('playbooks')
    .insert({
      company_id: userData.company_id,
      created_by: user.id,
      title: title.trim(),
      category: category?.trim() || null,
      content: content || '',
    })
    .select('id, title, category, content, updated_at, created_at')
    .single()

  if (error) {
    console.error('Error creating playbook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
