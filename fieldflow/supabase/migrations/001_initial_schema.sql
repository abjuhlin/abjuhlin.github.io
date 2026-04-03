-- FieldFlow Initial Schema Migration
-- Migration: 001_initial_schema.sql

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- companies
CREATE TABLE companies (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL,
  phone                       TEXT,
  email                       TEXT,
  logo_url                    TEXT,
  primary_color               TEXT DEFAULT '#E86C3A',
  google_review_url           TEXT,
  review_request_delay_hours  INTEGER DEFAULT 4,
  stripe_account_id           TEXT,
  default_terms               TEXT,
  notify_dispatch             BOOLEAN DEFAULT TRUE,
  notify_reminder_24h         BOOLEAN DEFAULT TRUE,
  notify_reminder_1h          BOOLEAN DEFAULT TRUE,
  notify_review_request       BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- users (mirrors auth.users)
CREATE TABLE users (
  id          UUID PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'tech')),
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- customers
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip         TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- proposals
CREATE TABLE proposals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id               UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  proposal_number           TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired')),
  title                     TEXT NOT NULL,
  message                   TEXT,
  line_items                JSONB DEFAULT '[]'::JSONB,
  subtotal                  NUMERIC DEFAULT 0,
  tax_rate                  NUMERIC DEFAULT 0,
  tax_amount                NUMERIC DEFAULT 0,
  total                     NUMERIC DEFAULT 0,
  deposit_required          BOOLEAN DEFAULT FALSE,
  deposit_type              TEXT CHECK (deposit_type IN ('percentage', 'fixed')),
  deposit_value             NUMERIC DEFAULT 0,
  deposit_amount            NUMERIC DEFAULT 0,
  deposit_paid              BOOLEAN DEFAULT FALSE,
  deposit_payment_intent_id TEXT,
  terms                     TEXT,
  signed_at                 TIMESTAMPTZ,
  signed_ip                 TEXT,
  viewed_at                 TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ,
  sent_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- jobs
CREATE TABLE jobs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id              UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  proposal_id              UUID REFERENCES proposals(id) ON DELETE SET NULL,
  job_number               TEXT NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  status                   TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'en_route', 'in_progress', 'complete', 'cancelled', 'invoiced', 'paid')),
  scheduled_start          TIMESTAMPTZ,
  scheduled_end            TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  assigned_tech_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  address                  TEXT,
  city                     TEXT,
  state                    TEXT,
  zip                      TEXT,
  internal_notes           TEXT,
  line_items               JSONB DEFAULT '[]'::JSONB,
  review_request_sent      BOOLEAN DEFAULT FALSE,
  review_request_sent_at   TIMESTAMPTZ,
  reminder_24h_sent        BOOLEAN DEFAULT FALSE,
  reminder_1h_sent         BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- invoices
CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
  invoice_number      TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  line_items          JSONB DEFAULT '[]'::JSONB,
  subtotal            NUMERIC DEFAULT 0,
  tax_rate            NUMERIC DEFAULT 0,
  tax_amount          NUMERIC DEFAULT 0,
  total               NUMERIC DEFAULT 0,
  amount_due          NUMERIC DEFAULT 0,
  deposit_applied     NUMERIC DEFAULT 0,
  due_date            DATE,
  paid_at             TIMESTAMPTZ,
  payment_intent_id   TEXT,
  payment_link_url    TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- job_photos
CREATE TABLE job_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  photo_type    TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  caption       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- playbooks
CREATE TABLE playbooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  content     TEXT DEFAULT '',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- sms_log
CREATE TABLE sms_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  to_phone        TEXT NOT NULL,
  message_type    TEXT NOT NULL CHECK (message_type IN ('dispatch', 'reminder', 'review_request', 'invoice', 'proposal')),
  message_body    TEXT NOT NULL,
  twilio_sid      TEXT,
  status          TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  related_job_id  UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- document_sequences (used for generating sequential document numbers)
CREATE TABLE document_sequences (
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type  TEXT NOT NULL CHECK (document_type IN ('proposal', 'job', 'invoice')),
  last_number    INTEGER DEFAULT 0,
  PRIMARY KEY (company_id, document_type)
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the company_id for the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Trigger function to auto-set updated_at on row modification
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER playbooks_updated_at
  BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Returns the next sequential number for a given company + document type,
-- formatted as a zero-padded string (e.g. 'PRO-0042', 'JOB-0007', 'INV-0123').
CREATE OR REPLACE FUNCTION get_next_number(p_company_id UUID, p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next   INTEGER;
  v_prefix TEXT;
BEGIN
  -- Resolve prefix
  v_prefix := CASE p_type
    WHEN 'proposal' THEN 'PRO'
    WHEN 'job'      THEN 'JOB'
    WHEN 'invoice'  THEN 'INV'
    ELSE UPPER(SUBSTRING(p_type FROM 1 FOR 3))
  END;

  -- Upsert the sequence row and return the incremented value atomically
  INSERT INTO document_sequences (company_id, document_type, last_number)
  VALUES (p_company_id, p_type, 1)
  ON CONFLICT (company_id, document_type)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Convenience wrappers
CREATE OR REPLACE FUNCTION generate_proposal_number(company_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_next_number(company_id, 'proposal');
$$;

CREATE OR REPLACE FUNCTION generate_job_number(company_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_next_number(company_id, 'job');
$$;

CREATE OR REPLACE FUNCTION generate_invoice_number(company_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_next_number(company_id, 'invoice');
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- companies policies
-- -------------------------------------------------------
CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

-- -------------------------------------------------------
-- users policies
-- -------------------------------------------------------
CREATE POLICY "users_select_same_company"
  ON users FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "users_insert_own_company"
  ON users FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "users_update_own_record"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete_same_company"
  ON users FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- customers policies
-- -------------------------------------------------------
CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "customers_delete"
  ON customers FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- proposals policies
-- -------------------------------------------------------
CREATE POLICY "proposals_select"
  ON proposals FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "proposals_insert"
  ON proposals FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "proposals_update"
  ON proposals FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "proposals_delete"
  ON proposals FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- jobs policies
-- -------------------------------------------------------
CREATE POLICY "jobs_select"
  ON jobs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "jobs_insert"
  ON jobs FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "jobs_update"
  ON jobs FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "jobs_delete"
  ON jobs FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- invoices policies
-- -------------------------------------------------------
CREATE POLICY "invoices_select"
  ON invoices FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "invoices_insert"
  ON invoices FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "invoices_update"
  ON invoices FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "invoices_delete"
  ON invoices FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- job_photos policies
-- -------------------------------------------------------
CREATE POLICY "job_photos_select"
  ON job_photos FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "job_photos_insert"
  ON job_photos FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "job_photos_update"
  ON job_photos FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "job_photos_delete"
  ON job_photos FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- playbooks policies
-- -------------------------------------------------------
CREATE POLICY "playbooks_select"
  ON playbooks FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "playbooks_insert"
  ON playbooks FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "playbooks_update"
  ON playbooks FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "playbooks_delete"
  ON playbooks FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- sms_log policies
-- -------------------------------------------------------
CREATE POLICY "sms_log_select"
  ON sms_log FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "sms_log_insert"
  ON sms_log FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "sms_log_update"
  ON sms_log FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "sms_log_delete"
  ON sms_log FOR DELETE
  USING (company_id = get_user_company_id());

-- -------------------------------------------------------
-- document_sequences policies
-- -------------------------------------------------------
CREATE POLICY "document_sequences_select"
  ON document_sequences FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "document_sequences_insert"
  ON document_sequences FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "document_sequences_update"
  ON document_sequences FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "document_sequences_delete"
  ON document_sequences FOR DELETE
  USING (company_id = get_user_company_id());
