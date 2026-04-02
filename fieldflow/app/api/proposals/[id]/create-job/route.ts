import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch the proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      id,
      title,
      proposal_number,
      status,
      customer_id,
      line_items,
      total,
      notes,
      company_id
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  if (proposal.status !== 'signed') {
    return NextResponse.json({ error: 'Can only create a job from a signed proposal' }, { status: 400 })
  }

  // Check if a job already exists for this proposal
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id')
    .eq('proposal_id', params.id)
    .maybeSingle()

  if (existingJob) {
    return NextResponse.json({ error: 'A job already exists for this proposal', jobId: existingJob.id }, { status: 409 })
  }

  // Create the job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      company_id: userData.company_id,
      customer_id: proposal.customer_id,
      proposal_id: params.id,
      title: proposal.title,
      status: 'scheduled',
      notes: proposal.notes || `Created from proposal ${proposal.proposal_number}`,
      total: proposal.total,
    })
    .select('id')
    .single()

  if (jobError) {
    console.error('Error creating job:', jobError)
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, jobId: job.id })
}
