import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Helper: days offset from now as ISO string
function daysFromNow(d: number, startOfDay = false) {
  const dt = new Date()
  dt.setDate(dt.getDate() + d)
  if (startOfDay) {
    dt.setHours(8, 0, 0, 0)
  }
  return dt.toISOString()
}

function dateOnly(d: number) {
  const dt = new Date()
  dt.setDate(dt.getDate() + d)
  return dt.toISOString().slice(0, 10)
}

function li(id: string, description: string, quantity: number, unit_price: number) {
  return { id, description, quantity, unit_price, total: quantity * unit_price }
}

// GET — check whether sample data is loaded
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { count, error } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)
    .eq('is_sample', true)

  if (error) {
    if (error.message.includes('is_sample')) {
      return NextResponse.json({ loaded: false, needsMigration: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ loaded: (count ?? 0) > 0 })
}

// POST — insert sample data
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const cid = userData.company_id

  // Check for existing sample data
  const { count: existing } = await supabase
    .from('customers').select('id', { count: 'exact', head: true })
    .eq('company_id', cid).eq('is_sample', true)
  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: 'Sample data already loaded.' }, { status: 409 })
  }

  // ── 1. Customers ──────────────────────────────────────────────────────────
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .insert([
      {
        company_id: cid, is_sample: true,
        full_name: 'Sarah Johnson', phone: '(512) 555-0182', email: 'sarah.j@example.com',
        address: '1423 Oak Hollow Rd', city: 'Austin', state: 'TX', zip: '78701',
        notes: 'Prefers morning appointments. HVAC system is 8 years old.',
      },
      {
        company_id: cid, is_sample: true,
        full_name: 'Mike Rodriguez', phone: '(512) 555-0247', email: 'mike.r@example.com',
        address: '809 Elm Creek Dr', city: 'Austin', state: 'TX', zip: '78702',
        notes: 'Has an older home — check water pressure before any plumbing work.',
      },
      {
        company_id: cid, is_sample: true,
        full_name: 'Linda Chen', phone: '(512) 555-0331', email: 'linda.chen@example.com',
        address: '2201 Riverside Ct', city: 'Austin', state: 'TX', zip: '78704',
        notes: 'Repeat customer — prefers text over calls.',
      },
      {
        company_id: cid, is_sample: true,
        full_name: 'David Park', phone: '(512) 555-0156', email: 'dpark@example.com',
        address: '445 Barton Hills Dr', city: 'Austin', state: 'TX', zip: '78704',
        notes: 'Interested in a full HVAC upgrade. Getting multiple quotes.',
      },
      {
        company_id: cid, is_sample: true,
        full_name: 'Emily Watson', phone: '(512) 555-0498', email: 'emily.watson@example.com',
        address: '1893 S Lamar Blvd', city: 'Austin', state: 'TX', zip: '78704',
        notes: 'Hot water issues started two months ago. Priority customer.',
      },
    ])
    .select('id, full_name')

  if (custErr || !customers) {
    if (custErr?.message.includes('is_sample')) {
      return NextResponse.json(
        { error: 'Migration required. Run supabase/migrations/002_add_is_sample.sql in your Supabase SQL editor first.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: custErr?.message ?? 'Failed to insert customers' }, { status: 500 })
  }

  const [sarah, mike, linda, david, emily] = customers

  // ── 2. Proposals ──────────────────────────────────────────────────────────
  const [proNum1, proNum2] = await Promise.all([
    supabase.rpc('generate_proposal_number', { company_id: cid }).then(r => r.data as string),
    supabase.rpc('generate_proposal_number', { company_id: cid }).then(r => r.data as string),
  ])

  const hvacLineItems = [
    li('p1a', 'Carrier 3-ton heat pump unit (16 SEER)', 1, 3800),
    li('p1b', 'Air handler with variable speed motor', 1, 1400),
    li('p1c', 'Installation & removal of old equipment', 1, 950),
    li('p1d', 'New thermostat (Ecobee SmartThermostat)', 1, 249),
    li('p1e', 'Ductwork inspection & sealing', 1, 350),
  ]
  const hvacSubtotal = hvacLineItems.reduce((s, i) => s + i.total, 0) // 6749
  const hvacTax = hvacSubtotal * 0.0825
  const hvacTotal = hvacSubtotal + hvacTax

  const bathLineItems = [
    li('p2a', 'Replace main shutoff valve', 1, 380),
    li('p2b', 'Replace shower valve & trim', 1, 520),
    li('p2c', 'Install new vanity faucet', 1, 285),
    li('p2d', 'Replace toilet fill valve & flapper', 1, 145),
    li('p2e', 'Labor (est. 8 hours)', 8, 95),
  ]
  const bathSubtotal = bathLineItems.reduce((s, i) => s + i.total, 0)
  const bathTotal = bathSubtotal

  const { data: proposals, error: propErr } = await supabase
    .from('proposals')
    .insert([
      {
        company_id: cid, is_sample: true,
        customer_id: david.id,
        proposal_number: proNum1,
        status: 'sent',
        title: 'Full HVAC System Replacement',
        message: 'Thank you for the opportunity to quote your HVAC replacement. The current system is showing signs of compressor wear and is no longer operating efficiently. The new Carrier heat pump system will reduce your energy bills by an estimated 30%. All work is guaranteed for 2 years.',
        terms: 'Payment due within 30 days of installation. 50% deposit required to begin work.',
        line_items: hvacLineItems,
        subtotal: hvacSubtotal,
        tax_rate: 8.25,
        tax_amount: hvacTax,
        total: hvacTotal,
        deposit_required: true,
        deposit_type: 'percentage',
        deposit_value: 50,
        deposit_amount: hvacTotal * 0.5,
        sent_at: daysFromNow(-7),
        viewed_at: daysFromNow(-5),
      },
      {
        company_id: cid, is_sample: true,
        customer_id: mike.id,
        proposal_number: proNum2,
        status: 'signed',
        title: 'Bathroom Plumbing Renovation',
        message: 'Complete bathroom plumbing overhaul including shower, vanity, and toilet repairs.',
        terms: 'Payment due upon completion.',
        line_items: bathLineItems,
        subtotal: bathSubtotal,
        tax_rate: 0,
        tax_amount: 0,
        total: bathTotal,
        deposit_required: false,
        sent_at: daysFromNow(-20),
        viewed_at: daysFromNow(-19),
        signed_at: daysFromNow(-18),
      },
    ])
    .select('id, proposal_number')

  if (propErr || !proposals) {
    return NextResponse.json({ error: propErr?.message ?? 'Failed to insert proposals' }, { status: 500 })
  }

  const [propHVAC, propBath] = proposals

  // ── 3. Jobs ───────────────────────────────────────────────────────────────
  const jobNums = await Promise.all(
    Array.from({ length: 9 }, () =>
      supabase.rpc('generate_job_number', { company_id: cid }).then(r => r.data as string)
    )
  )

  const { data: jobs, error: jobErr } = await supabase
    .from('jobs')
    .insert([
      // 1 – scheduled (tomorrow)
      {
        company_id: cid, is_sample: true,
        customer_id: sarah.id,
        job_number: jobNums[0],
        title: 'AC Tune-Up & Filter Replacement',
        description: 'Annual maintenance visit. Clean coils, check refrigerant, replace filters (4 units).',
        status: 'scheduled',
        scheduled_start: daysFromNow(1, true),
        scheduled_end: new Date(new Date(daysFromNow(1, true)).getTime() + 2 * 3600000).toISOString(),
        address: '1423 Oak Hollow Rd', city: 'Austin', state: 'TX', zip: '78701',
        internal_notes: 'Customer has 3 Nest thermostats — double check compatibility after service.',
      },
      // 2 – unscheduled (no date)
      {
        company_id: cid, is_sample: true,
        customer_id: mike.id,
        job_number: jobNums[1],
        title: 'Kitchen Faucet Replacement',
        description: 'Customer reported leaking at the base. Replace faucet and supply lines.',
        status: 'scheduled',
        scheduled_start: null,
        address: '809 Elm Creek Dr', city: 'Austin', state: 'TX', zip: '78702',
        internal_notes: 'Need to confirm date with customer — call before scheduling.',
      },
      // 3 – scheduled (3 days)
      {
        company_id: cid, is_sample: true,
        customer_id: linda.id,
        job_number: jobNums[2],
        title: 'Electrical Panel Inspection',
        description: 'Inspect main breaker panel for code compliance. Customer planning a kitchen remodel.',
        status: 'scheduled',
        scheduled_start: daysFromNow(3, true),
        scheduled_end: new Date(new Date(daysFromNow(3, true)).getTime() + 1.5 * 3600000).toISOString(),
        address: '2201 Riverside Ct', city: 'Austin', state: 'TX', zip: '78704',
      },
      // 4 – in progress (today)
      {
        company_id: cid, is_sample: true,
        customer_id: emily.id,
        job_number: jobNums[3],
        title: 'Water Heater Flush & Inspection',
        description: 'Flush sediment, inspect anode rod, check T&P valve. Customer reporting reduced hot water.',
        status: 'in_progress',
        scheduled_start: daysFromNow(0, true),
        scheduled_end: new Date(new Date(daysFromNow(0, true)).getTime() + 2 * 3600000).toISOString(),
        address: '1893 S Lamar Blvd', city: 'Austin', state: 'TX', zip: '78704',
        internal_notes: 'Water heater is 11 years old. May recommend replacement — quote ready if needed.',
      },
      // 5 – scheduled (next week)
      {
        company_id: cid, is_sample: true,
        customer_id: david.id,
        job_number: jobNums[4],
        title: 'HVAC Duct Inspection & Cleaning',
        description: 'Full duct system inspection. Clean registers, check for leaks.',
        status: 'scheduled',
        scheduled_start: daysFromNow(8, true),
        scheduled_end: new Date(new Date(daysFromNow(8, true)).getTime() + 3 * 3600000).toISOString(),
        address: '445 Barton Hills Dr', city: 'Austin', state: 'TX', zip: '78704',
      },
      // 6 – complete (5 days ago)
      {
        company_id: cid, is_sample: true,
        customer_id: linda.id,
        job_number: jobNums[5],
        title: 'Bathroom Exhaust Fan Installation',
        description: 'Install Broan NuTone exhaust fan. Old fan was loud and not moving air.',
        status: 'complete',
        scheduled_start: daysFromNow(-5, true),
        scheduled_end: new Date(new Date(daysFromNow(-5, true)).getTime() + 1.5 * 3600000).toISOString(),
        completed_at: daysFromNow(-5),
        address: '2201 Riverside Ct', city: 'Austin', state: 'TX', zip: '78704',
        line_items: [li('j6a', 'Broan NuTone 80 CFM exhaust fan', 1, 89), li('j6b', 'Installation labor', 1.5, 95)],
      },
      // 7 – complete (12 days ago)
      {
        company_id: cid, is_sample: true,
        customer_id: sarah.id,
        job_number: jobNums[6],
        title: 'Garbage Disposal Replacement',
        description: 'InSinkErator Evolution Excel 1HP installed. Old unit seized.',
        status: 'complete',
        scheduled_start: daysFromNow(-12, true),
        completed_at: daysFromNow(-12),
        address: '1423 Oak Hollow Rd', city: 'Austin', state: 'TX', zip: '78701',
        line_items: [li('j7a', 'InSinkErator Evolution Excel 1HP', 1, 279), li('j7b', 'Installation & disposal removal', 1, 145)],
      },
      // 8 – invoiced (20 days ago) — invoice will be sent
      {
        company_id: cid, is_sample: true,
        customer_id: sarah.id,
        job_number: jobNums[7],
        title: 'Refrigerant Recharge — AC Unit',
        description: 'R-410A recharge. System was 1.5 lbs low. Checked for leaks — none found.',
        status: 'invoiced',
        scheduled_start: daysFromNow(-20, true),
        completed_at: daysFromNow(-20),
        address: '1423 Oak Hollow Rd', city: 'Austin', state: 'TX', zip: '78701',
        line_items: [li('j8a', 'R-410A refrigerant (1.5 lbs)', 1.5, 85), li('j8b', 'Service call & labor', 1, 165)],
      },
      // 9 – paid (35 days ago) — from signed proposal
      {
        company_id: cid, is_sample: true,
        customer_id: emily.id,
        proposal_id: propBath.id,
        job_number: jobNums[8],
        title: 'Water Heater Replacement',
        description: 'Replaced old 40-gal gas water heater with Rheem Performance Plus 50-gal. Customer had no hot water.',
        status: 'paid',
        scheduled_start: daysFromNow(-35, true),
        completed_at: daysFromNow(-34),
        address: '1893 S Lamar Blvd', city: 'Austin', state: 'TX', zip: '78704',
        line_items: [
          li('j9a', 'Rheem Performance Plus 50-gal gas water heater', 1, 749),
          li('j9b', 'Installation & removal of old unit', 1, 285),
          li('j9c', 'Expansion tank & fittings', 1, 95),
          li('j9d', 'Permit & inspection fee', 1, 75),
        ],
      },
    ])
    .select('id, job_number, status')

  if (jobErr || !jobs) {
    return NextResponse.json({ error: jobErr?.message ?? 'Failed to insert jobs' }, { status: 500 })
  }

  const jobInvoiced = jobs[7]   // "Refrigerant Recharge" — will get sent invoice
  const jobPaid = jobs[8]       // "Water Heater" — will get paid invoice
  const jobComplete1 = jobs[5]  // "Bathroom Exhaust Fan"
  const jobComplete2 = jobs[6]  // "Garbage Disposal"

  // ── 4. Invoices ───────────────────────────────────────────────────────────
  const invNums = await Promise.all(
    Array.from({ length: 4 }, () =>
      supabase.rpc('generate_invoice_number', { company_id: cid }).then(r => r.data as string)
    )
  )

  // Refrigerant recharge — sent, due soon
  const refLineItems = [li('j8a', 'R-410A refrigerant (1.5 lbs)', 1.5, 85), li('j8b', 'Service call & labor', 1, 165)]
  const refSubtotal = refLineItems.reduce((s, i) => s + i.total, 0)

  // Water heater — paid
  const whLineItems = [
    li('j9a', 'Rheem Performance Plus 50-gal gas water heater', 1, 749),
    li('j9b', 'Installation & removal of old unit', 1, 285),
    li('j9c', 'Expansion tank & fittings', 1, 95),
    li('j9d', 'Permit & inspection fee', 1, 75),
  ]
  const whSubtotal = whLineItems.reduce((s, i) => s + i.total, 0)
  const whTax = whSubtotal * 0.0825
  const whTotal = whSubtotal + whTax

  // Exhaust fan — draft
  const fanLineItems = [li('j6a', 'Broan NuTone 80 CFM exhaust fan', 1, 89), li('j6b', 'Installation labor', 1.5, 95)]
  const fanSubtotal = fanLineItems.reduce((s, i) => s + i.total, 0)

  // Garbage disposal — overdue standalone
  const gdLineItems = [li('j7a', 'InSinkErator Evolution Excel 1HP', 1, 279), li('j7b', 'Installation & disposal removal', 1, 145)]
  const gdSubtotal = gdLineItems.reduce((s, i) => s + i.total, 0)

  const { error: invErr } = await supabase
    .from('invoices')
    .insert([
      // 1 — Sent, due in 10 days (refrigerant job)
      {
        company_id: cid, is_sample: true,
        customer_id: sarah.id,
        job_id: jobInvoiced.id,
        invoice_number: invNums[0],
        status: 'sent',
        line_items: refLineItems,
        subtotal: refSubtotal,
        tax_rate: 0, tax_amount: 0,
        total: refSubtotal,
        deposit_applied: 0,
        amount_due: refSubtotal,
        due_date: dateOnly(10),
        sent_at: daysFromNow(-5),
      },
      // 2 — Paid (water heater job, from signed proposal)
      {
        company_id: cid, is_sample: true,
        customer_id: emily.id,
        job_id: jobPaid.id,
        invoice_number: invNums[1],
        status: 'paid',
        line_items: whLineItems,
        subtotal: whSubtotal,
        tax_rate: 8.25, tax_amount: whTax,
        total: whTotal,
        deposit_applied: 0,
        amount_due: 0,
        due_date: dateOnly(-20),
        sent_at: daysFromNow(-33),
        paid_at: daysFromNow(-28),
      },
      // 3 — Draft (exhaust fan job)
      {
        company_id: cid, is_sample: true,
        customer_id: linda.id,
        job_id: jobComplete1.id,
        invoice_number: invNums[2],
        status: 'draft',
        line_items: fanLineItems,
        subtotal: fanSubtotal,
        tax_rate: 0, tax_amount: 0,
        total: fanSubtotal,
        deposit_applied: 0,
        amount_due: fanSubtotal,
        due_date: dateOnly(25),
      },
      // 4 — Overdue (garbage disposal job)
      {
        company_id: cid, is_sample: true,
        customer_id: sarah.id,
        job_id: jobComplete2.id,
        invoice_number: invNums[3],
        status: 'overdue',
        line_items: gdLineItems,
        subtotal: gdSubtotal,
        tax_rate: 0, tax_amount: 0,
        total: gdSubtotal,
        deposit_applied: 0,
        amount_due: gdSubtotal,
        due_date: dateOnly(-8),
        sent_at: daysFromNow(-22),
      },
    ])

  if (invErr) {
    return NextResponse.json({ error: invErr.message ?? 'Failed to insert invoices' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Sample data loaded.' })
}

// DELETE — remove all sample data for this company
export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const cid = userData.company_id

  // Delete in reverse FK order
  await supabase.from('invoices').delete().eq('company_id', cid).eq('is_sample', true)
  await supabase.from('jobs').delete().eq('company_id', cid).eq('is_sample', true)
  await supabase.from('proposals').delete().eq('company_id', cid).eq('is_sample', true)
  const { error } = await supabase.from('customers').delete().eq('company_id', cid).eq('is_sample', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'Sample data removed.' })
}
