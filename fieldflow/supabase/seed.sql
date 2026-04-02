-- FieldFlow Demo Seed Data
-- Run this AFTER applying 001_initial_schema.sql
-- NOTE: Replace user IDs with real auth.users IDs after signup.

-- ============================================================
-- COMPANY
-- ============================================================
INSERT INTO companies (
  id,
  name,
  phone,
  email,
  primary_color,
  google_review_url,
  review_request_delay_hours,
  default_terms,
  notify_dispatch,
  notify_reminder_24h,
  notify_reminder_1h,
  notify_review_request
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo HVAC Co.',
  '+15555550100',
  'info@demohvac.com',
  '#E86C3A',
  'https://g.page/r/demo-review-link',
  4,
  'Payment is due upon completion of service. A late fee of 1.5% per month will be applied to invoices not paid within 30 days.',
  TRUE,
  TRUE,
  TRUE,
  TRUE
);

-- ============================================================
-- USERS
-- NOTE: Replace these UUIDs with actual auth.users IDs after signup.
-- ============================================================
INSERT INTO users (id, company_id, email, full_name, role, phone) VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'owner@demohvac.com',
    'John Smith',
    'owner',
    '+15555550101'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'mike@demohvac.com',
    'Mike Johnson',
    'tech',
    '+15555550102'
  );

-- ============================================================
-- CUSTOMERS
-- ============================================================
INSERT INTO customers (id, company_id, full_name, email, phone, address, city, state, zip, notes) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Sarah Martinez',
    'sarah.martinez@email.com',
    '+15555550201',
    '142 Maple Drive',
    'Phoenix',
    'AZ',
    '85001',
    'Prefers morning appointments. Has two dogs — both friendly.'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'David Chen',
    'david.chen@email.com',
    '+15555550202',
    '87 Oak Street',
    'Scottsdale',
    'AZ',
    '85251',
    'Commercial property — call ahead before arriving.'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Linda Nguyen',
    'linda.nguyen@email.com',
    '+15555550203',
    '310 Cactus Blvd',
    'Tempe',
    'AZ',
    '85281',
    NULL
  );

-- ============================================================
-- DOCUMENT SEQUENCES (seed so numbers start at the right spot)
-- ============================================================
INSERT INTO document_sequences (company_id, document_type, last_number) VALUES
  ('00000000-0000-0000-0000-000000000001', 'proposal', 2),
  ('00000000-0000-0000-0000-000000000001', 'job',      2),
  ('00000000-0000-0000-0000-000000000001', 'invoice',  1);

-- ============================================================
-- PROPOSALS
-- ============================================================
INSERT INTO proposals (
  id, company_id, customer_id, proposal_number, status, title, message,
  line_items, subtotal, tax_rate, tax_amount, total,
  deposit_required, deposit_type, deposit_value, deposit_amount, deposit_paid,
  terms, signed_at, signed_ip, viewed_at, sent_at, expires_at
) VALUES
  -- Signed proposal
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'PRO-0001',
    'signed',
    'HVAC System Replacement — 5-Ton Unit',
    'Thank you for considering Demo HVAC Co. We are pleased to provide this proposal for a full HVAC system replacement at your property.',
    '[
      {"id":"li-001","description":"Carrier 5-Ton 16 SEER2 Heat Pump (25HCE548A003)","quantity":1,"unit_price":3200.00,"total":3200.00},
      {"id":"li-002","description":"Air Handler Unit — Carrier FV4CNF005L00","quantity":1,"unit_price":1450.00,"total":1450.00},
      {"id":"li-003","description":"Labor — Installation (estimated 8 hrs)","quantity":8,"unit_price":95.00,"total":760.00},
      {"id":"li-004","description":"Disconnect Box & Pad — new installation","quantity":1,"unit_price":180.00,"total":180.00},
      {"id":"li-005","description":"Refrigerant — R-410A (lbs)","quantity":8,"unit_price":22.50,"total":180.00},
      {"id":"li-006","description":"Permit & Inspection fee","quantity":1,"unit_price":150.00,"total":150.00}
    ]'::jsonb,
    5920.00,
    8.6,
    508.92,
    6428.92,
    TRUE,
    'percentage',
    50,
    3214.46,
    TRUE,
    'Payment is due upon completion. 50% deposit required to schedule work.',
    NOW() - INTERVAL '5 days',
    '192.168.1.100',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '23 days'
  ),
  -- Draft proposal
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'PRO-0002',
    'draft',
    'Commercial Rooftop Unit Tune-Up & Coil Cleaning',
    'Per our conversation, here is a proposal for the seasonal maintenance of your rooftop HVAC units.',
    '[
      {"id":"li-007","description":"RTU Preventative Maintenance (per unit)","quantity":3,"unit_price":225.00,"total":675.00},
      {"id":"li-008","description":"Evaporator Coil Cleaning (per unit)","quantity":3,"unit_price":120.00,"total":360.00},
      {"id":"li-009","description":"Condenser Coil Cleaning (per unit)","quantity":3,"unit_price":95.00,"total":285.00},
      {"id":"li-010","description":"Filter Replacement — 20x25x2 MERV-8","quantity":6,"unit_price":18.00,"total":108.00},
      {"id":"li-011","description":"Travel / Mobilization fee","quantity":1,"unit_price":75.00,"total":75.00}
    ]'::jsonb,
    1503.00,
    8.6,
    129.26,
    1632.26,
    FALSE,
    NULL,
    0,
    0,
    FALSE,
    'Net 30. Payment due within 30 days of invoice date.',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() + INTERVAL '30 days'
  );

-- ============================================================
-- JOBS
-- ============================================================
INSERT INTO jobs (
  id, company_id, customer_id, proposal_id, job_number, title, description, status,
  scheduled_start, scheduled_end, completed_at, assigned_tech_id,
  address, city, state, zip, internal_notes,
  line_items, review_request_sent, reminder_24h_sent, reminder_1h_sent
) VALUES
  -- Scheduled job
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000020',
    'JOB-0001',
    'HVAC System Replacement — Martinez Residence',
    'Full 5-ton heat pump and air handler replacement. Equipment has been ordered and confirmed delivered to warehouse.',
    'scheduled',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days' + INTERVAL '8 hours',
    NULL,
    '00000000-0000-0000-0000-000000000003',
    '142 Maple Drive',
    'Phoenix',
    'AZ',
    '85001',
    'Gate code: 1234. Park in driveway. Equipment staged in warehouse bay 3.',
    '[
      {"id":"li-001","description":"Carrier 5-Ton 16 SEER2 Heat Pump (25HCE548A003)","quantity":1,"unit_price":3200.00,"total":3200.00},
      {"id":"li-002","description":"Air Handler Unit — Carrier FV4CNF005L00","quantity":1,"unit_price":1450.00,"total":1450.00},
      {"id":"li-003","description":"Labor — Installation (estimated 8 hrs)","quantity":8,"unit_price":95.00,"total":760.00},
      {"id":"li-004","description":"Disconnect Box & Pad — new installation","quantity":1,"unit_price":180.00,"total":180.00},
      {"id":"li-005","description":"Refrigerant — R-410A (lbs)","quantity":8,"unit_price":22.50,"total":180.00},
      {"id":"li-006","description":"Permit & Inspection fee","quantity":1,"unit_price":150.00,"total":150.00}
    ]'::jsonb,
    FALSE,
    FALSE,
    FALSE
  ),
  -- Completed job
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000012',
    NULL,
    'JOB-0002',
    'AC No-Cool Service Call — Nguyen Residence',
    'Customer reported AC not cooling. Diagnosed failed capacitor on condenser unit.',
    'complete',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '2 hours',
    NOW() - INTERVAL '3 days' + INTERVAL '90 minutes',
    '00000000-0000-0000-0000-000000000003',
    '310 Cactus Blvd',
    'Tempe',
    'AZ',
    '85281',
    'Replaced 45/5 MFD dual-run capacitor. Checked refrigerant charge — within spec. Unit running normally at departure.',
    '[
      {"id":"li-012","description":"Service Call / Diagnostic Fee","quantity":1,"unit_price":89.00,"total":89.00},
      {"id":"li-013","description":"45/5 MFD 370V Dual-Run Capacitor","quantity":1,"unit_price":45.00,"total":45.00},
      {"id":"li-014","description":"Labor — Repair (1 hr)","quantity":1,"unit_price":95.00,"total":95.00}
    ]'::jsonb,
    TRUE,
    TRUE,
    TRUE
  );

-- Update review_request_sent_at for the completed job
UPDATE jobs
SET review_request_sent_at = NOW() - INTERVAL '3 days' + INTERVAL '94 minutes'
WHERE id = '00000000-0000-0000-0000-000000000031';

-- ============================================================
-- INVOICES
-- ============================================================
INSERT INTO invoices (
  id, company_id, customer_id, job_id, invoice_number, status,
  line_items, subtotal, tax_rate, tax_amount, total, amount_due, deposit_applied,
  due_date, sent_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000031',
    'INV-0001',
    'sent',
    '[
      {"id":"li-012","description":"Service Call / Diagnostic Fee","quantity":1,"unit_price":89.00,"total":89.00},
      {"id":"li-013","description":"45/5 MFD 370V Dual-Run Capacitor","quantity":1,"unit_price":45.00,"total":45.00},
      {"id":"li-014","description":"Labor — Repair (1 hr)","quantity":1,"unit_price":95.00,"total":95.00}
    ]'::jsonb,
    229.00,
    8.6,
    19.69,
    248.69,
    248.69,
    0.00,
    NOW() + INTERVAL '27 days',
    NOW() - INTERVAL '3 days' + INTERVAL '3 hours'
  );

-- ============================================================
-- PLAYBOOKS
-- ============================================================
INSERT INTO playbooks (id, company_id, title, category, content, created_by) VALUES
  (
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000001',
    'Seasonal HVAC Preventative Maintenance SOP',
    'Technical',
    '# Seasonal HVAC Preventative Maintenance SOP

## Purpose
Ensure all technicians perform preventative maintenance visits consistently and completely, maximizing equipment lifespan and customer satisfaction.

## Required Tools & Materials
- Digital manifold gauge set
- Multimeter
- Coil fin comb
- Coil cleaner (non-acid, biodegradable)
- Replacement filters (bring common sizes: 16x25x1, 20x25x1, 20x25x2)
- Capacitor tester
- Infrared thermometer
- Shop vacuum with blower attachment
- Camera (for before/after photos)

## Pre-Visit Checklist
1. Review customer notes in FieldFlow before departure.
2. Confirm appointment time with customer via SMS (dispatched automatically).
3. Load correct parts based on equipment model noted in job details.

## On-Site Procedure

### Step 1 — Arrival & Safety
- Take a **before photo** of indoor and outdoor units before touching anything.
- Introduce yourself professionally. Confirm which system(s) are being serviced.
- Lock out / tag out: turn system OFF at thermostat and disconnect.

### Step 2 — Outdoor Condenser Unit
- [ ] Inspect and clear debris from around unit (maintain 2 ft clearance).
- [ ] Remove access panels.
- [ ] Visually inspect refrigerant lines for signs of oiling or damage.
- [ ] Test and record capacitor readings (compare to nameplate rating ±6%).
- [ ] Inspect contactor — check for pitting or burning; replace if needed.
- [ ] Clean condenser coils with approved coil cleaner (rinse thoroughly).
- [ ] Straighten bent fins with fin comb.
- [ ] Check fan blade for cracks; confirm tight set screw.
- [ ] Measure and record supply / return temperature differential (target: 14–22°F).

### Step 3 — Indoor Air Handler / Furnace
- [ ] Replace air filter — record size and MERV rating in FieldFlow notes.
- [ ] Inspect evaporator coil — note any frost, debris, or damage.
- [ ] Clear condensate drain line (use vacuum or CO2 flush).
- [ ] Check blower motor and wheel — clean if needed.
- [ ] Inspect heat exchanger (gas systems) — look for cracks or corrosion.
- [ ] Check electrical connections; tighten any loose terminals.
- [ ] Lubricate motors if oil ports are present.

### Step 4 — System Start-Up & Testing
- [ ] Restore power and set thermostat to call for cooling (or heat in winter).
- [ ] Measure and record amperage draw for compressor and fan motors.
- [ ] Check and record supply / return static pressure.
- [ ] Record refrigerant pressures (suction and discharge).
- [ ] Confirm system reaches setpoint before leaving.

### Step 5 — Wrap-Up
- Take **after photos** of indoor and outdoor units.
- Walk the customer through findings.
- Note any deferred repairs or recommendations in FieldFlow.
- Collect payment or confirm invoice will be sent.

## Documentation
- All readings must be entered in the job notes within 2 hours of visit completion.
- Upload before/after photos before closing the job.
- If a follow-up visit is needed, create a new job and link it to the customer record.',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000001',
    'Customer Service & Communication Guide',
    'Operations',
    '# Customer Service & Communication Guide

## Our Standard
Every customer interaction represents Demo HVAC Co. At minimum, customers should feel **informed, respected, and confident** in our work. Going beyond that builds reviews, referrals, and repeat business.

## Phone & Text Etiquette
- Answer calls within 3 rings during business hours.
- Voicemails must be returned within 2 hours.
- Never leave a customer waiting more than 24 hours for a response of any kind.
- Use the customer''s first name in conversation.
- Confirm appointment details verbally before hanging up.

## Before the Visit
1. The dispatch SMS is sent automatically by FieldFlow when a job is created — confirm the customer received it if you call ahead.
2. Call or text the customer 30 minutes before arrival to give a heads-up.
3. If you will be late by more than 15 minutes, call immediately — do not wait until arrival time.

## On-Site Communication
- **Introduce yourself by name** when the customer answers the door.
- Ask where they would like you to park and if there are any access restrictions.
- Before starting work, spend 2–3 minutes asking the customer to describe the issue in their own words — even if you already know what it is. It builds trust.
- **Never** quote a price in the field without confirming in FieldFlow first.
- If you discover additional issues, say: *"While I was in there, I noticed X. I can send you a proposal for that today if you''d like — no pressure."*

## Delivering Bad News
- Be direct but empathetic: *"I have some news that isn''t great, but I want to walk you through it."*
- Always explain **why** something happened, not just what is broken.
- Offer a solution or next step immediately after delivering the news.
- Never blame previous contractors in front of the customer.

## Collecting Payment
- Review the work completed before asking for payment.
- Say: *"Everything is running great. I''ll send your invoice by text — you can pay online whenever is convenient."*
- If the customer wants to pay by check, accept it and mark the invoice accordingly.
- Never leave a job site without confirming the customer is satisfied.

## Handling Complaints
1. Listen without interrupting.
2. Apologize for the experience (not necessarily the fault): *"I''m sorry you''re dealing with this."*
3. Repeat the issue back to confirm understanding.
4. Offer a concrete resolution with a timeline.
5. Escalate to the owner immediately for any complaint involving a safety concern or threat of legal action.
6. Log all complaints in the customer notes field in FieldFlow.

## Review Requests
- A review request SMS is sent automatically 4 hours after a job is marked complete.
- If a customer mentions they are happy, you can say: *"That really means a lot — we''d love it if you had a moment to leave us a Google review. I''ll send you a link."*
- Never offer discounts or incentives in exchange for reviews.

## Do''s and Don''ts
| Do | Don''t |
|----|--------|
| Use the customer''s name | Use slang or profanity |
| Wear boot covers indoors | Track mud or debris inside |
| Clean up your work area | Leave packaging or old parts behind |
| Explain what you did | Use technical jargon without explaining |
| Follow up on open issues | Let things fall through the cracks |',
    '00000000-0000-0000-0000-000000000002'
  );
