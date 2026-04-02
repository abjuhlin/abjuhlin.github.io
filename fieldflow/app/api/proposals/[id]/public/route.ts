import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

// Public endpoint — no authentication required.
// Uses service role to bypass RLS so clients can view their own proposal.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      id,
      proposal_number,
      title,
      message,
      terms,
      line_items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      deposit_required,
      deposit_type,
      deposit_value,
      deposit_amount,
      status,
      signed_at,
      company_id,
      customers (
        id,
        full_name,
        phone,
        email
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Fetch the company for branding
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, primary_color, phone, email')
    .eq('id', proposal.company_id)
    .single()

  return NextResponse.json({
    ...proposal,
    companies: company ?? null,
  })
}
