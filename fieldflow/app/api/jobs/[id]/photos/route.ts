import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  // Verify the job belongs to this company
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, company_id')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const photoType = formData.get('photo_type') as string | null
  const caption = formData.get('caption') as string | null

  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!photoType || !['before', 'after'].includes(photoType)) {
    return NextResponse.json({ error: 'photo_type must be "before" or "after"' }, { status: 400 })
  }

  // Build storage path
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storagePath = `${userData.company_id}/jobs/${params.id}/${photoType}/${filename}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Use service role client for storage upload to bypass RLS on storage
  const serviceClient = createServiceRoleClient()

  const { error: uploadError } = await serviceClient.storage
    .from('job-photos')
    .upload(storagePath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = serviceClient.storage.from('job-photos').getPublicUrl(storagePath)

  // Create job_photos record
  const { data: photo, error: insertError } = await supabase
    .from('job_photos')
    .insert({
      job_id: params.id,
      company_id: userData.company_id,
      uploaded_by: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      photo_type: photoType as 'before' | 'after',
      caption: caption?.trim() || null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating photo record:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(photo, { status: 201 })
}
