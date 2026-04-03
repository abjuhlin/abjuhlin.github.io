import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
      { status: 400 }
    )
  }

  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const filename = `logo-${Date.now()}.${ext}`
  const storagePath = `logos/${userData.company_id}/${filename}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Use service role client for storage upload to bypass RLS
  const serviceClient = createServiceRoleClient()

  const { error: uploadError } = await serviceClient.storage
    .from('company-assets')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from('company-assets').getPublicUrl(storagePath)

  // Update company logo_url
  const { error: updateError } = await supabase
    .from('companies')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userData.company_id)

  if (updateError) {
    console.error('Error updating logo URL:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ logo_url: publicUrl })
}
