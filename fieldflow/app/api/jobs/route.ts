import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSMS, formatPhoneForSMS } from '@/lib/twilio'

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
  const status = searchParams.get('status')

  let query = supabase
    .from('jobs')
    .select(
      `
      id,
      job_number,
      title,
      status,
      scheduled_start,
      scheduled_end,
      address,
      city,
      state,
      created_at,
      customers ( id, full_name, phone, email ),
      users!assigned_tech_id ( id, full_name, phone )
    `
    )
    .eq('company_id', userData.company_id)
    .order('scheduled_start', { ascending: true, nullsFirst: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching jobs:', error)
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

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    customer_id,
    proposal_id,
    title,
    description,
    scheduled_start,
    scheduled_end,
    assigned_tech_id,
    address,
    city,
    state,
    zip,
    internal_notes,
    line_items,
  } = body

  if (!customer_id) return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // Generate job number via DB function
  const { data: jobNumberData, error: seqError } = await supabase.rpc('generate_job_number', {
    company_id: userData.company_id,
  })

  if (seqError || !jobNumberData) {
    console.error('Error generating job number:', seqError)
    return NextResponse.json({ error: 'Failed to generate job number' }, { status: 500 })
  }

  const { data: job, error: insertError } = await supabase
    .from('jobs')
    .insert({
      company_id: userData.company_id,
      customer_id,
      proposal_id: proposal_id ?? null,
      job_number: jobNumberData,
      title,
      description: description ?? null,
      status: 'scheduled',
      scheduled_start: scheduled_start ?? null,
      scheduled_end: scheduled_end ?? null,
      assigned_tech_id: assigned_tech_id ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      zip: zip ?? null,
      internal_notes: internal_notes ?? null,
      line_items: line_items ?? [],
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating job:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send dispatch SMS to tech if assigned
  if (assigned_tech_id && job) {
    try {
      const { data: tech } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', assigned_tech_id)
        .single()

      if (tech?.phone) {
        const scheduledText = scheduled_start
          ? new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(new Date(scheduled_start))
          : 'TBD'

        const addressLine = [address, city, state].filter(Boolean).join(', ')

        const smsBody =
          `FieldFlow Dispatch: You have been assigned job ${job.job_number}.\n` +
          `Job: ${title}\n` +
          (addressLine ? `Address: ${addressLine}\n` : '') +
          `Scheduled: ${scheduledText}\n` +
          `View: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/jobs/${job.id}`

        await sendSMS(formatPhoneForSMS(tech.phone), smsBody)
      }
    } catch (smsErr) {
      // SMS failure should not block job creation
      console.error('Dispatch SMS error:', smsErr)
    }
  }

  return NextResponse.json(job, { status: 201 })
}
