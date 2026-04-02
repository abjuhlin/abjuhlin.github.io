import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Public endpoint — no auth required. Use service role to bypass RLS.
  const supabase = createServiceRoleClient()

  // Only update if status is currently 'sent'
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  if (proposal.status !== 'sent') {
    // Already viewed, signed, or in another state — still return success
    return NextResponse.json({ success: true, changed: false })
  }

  const { error } = await supabase
    .from('proposals')
    .update({
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('status', 'sent') // Guard against race conditions

  if (error) {
    console.error('Error marking proposal as viewed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, changed: true })
}
