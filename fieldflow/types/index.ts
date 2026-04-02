// ─── Status Union Types ────────────────────────────────────────────────────

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'invoiced'

export type JobStatus =
  | 'scheduled'
  | 'en_route'
  | 'in_progress'
  | 'complete'
  | 'cancelled'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'void'

export type UserRole = 'owner' | 'admin' | 'tech'

export type ServiceType = 'hvac' | 'plumbing' | 'electrical' | 'other'

// ─── Line Item ────────────────────────────────────────────────────────────

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

// ─── Database Tables ──────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
  license_number: string | null
  service_types: ServiceType[]
  stripe_account_id: string | null
  stripe_customer_id: string | null
  twilio_number: string | null
  proposal_footer: string | null
  invoice_footer: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  company_id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  company_id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  company_id: string
  customer_id: string
  created_by: string
  title: string
  description: string | null
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  status: ProposalStatus
  valid_until: string | null
  signed_at: string | null
  signature_url: string | null
  signed_by_name: string | null
  viewed_at: string | null
  sent_at: string | null
  notes: string | null
  internal_notes: string | null
  playbook_id: string | null
  created_at: string
  updated_at: string
  // Joined fields
  customer?: Customer
  created_by_user?: User
}

export interface Job {
  id: string
  company_id: string
  customer_id: string
  proposal_id: string | null
  invoice_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  service_type: ServiceType
  status: JobStatus
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  internal_notes: string | null
  checklist: ChecklistItem[] | null
  created_at: string
  updated_at: string
  // Joined fields
  customer?: Customer
  assigned_user?: User
  proposal?: Proposal
  invoice?: Invoice
  photos?: JobPhoto[]
}

export interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  completed_at: string | null
}

export interface Invoice {
  id: string
  company_id: string
  customer_id: string
  job_id: string | null
  proposal_id: string | null
  created_by: string
  invoice_number: string
  title: string
  description: string | null
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  status: InvoiceStatus
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  viewed_at: string | null
  stripe_payment_intent_id: string | null
  stripe_payment_link_url: string | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  customer?: Customer
  created_by_user?: User
  job?: Job
}

export interface JobPhoto {
  id: string
  job_id: string
  company_id: string
  uploaded_by: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  taken_at: string | null
  created_at: string
  // Joined fields
  uploaded_by_user?: User
}

export interface Playbook {
  id: string
  company_id: string
  created_by: string
  title: string
  description: string | null
  service_type: ServiceType | null
  line_items: LineItem[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SmsLog {
  id: string
  company_id: string
  customer_id: string | null
  job_id: string | null
  proposal_id: string | null
  invoice_id: string | null
  sent_by: string | null
  to_number: string
  from_number: string
  body: string
  twilio_sid: string | null
  status: 'sent' | 'delivered' | 'failed' | 'undelivered'
  error_message: string | null
  created_at: string
}

// ─── Database Type (for Supabase generics) ───────────────────────────────

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
      }
      proposals: {
        Row: Proposal
        Insert: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'customer' | 'created_by_user'>
        Update: Partial<Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'customer' | 'created_by_user'>>
      }
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'customer' | 'assigned_user' | 'proposal' | 'invoice' | 'photos'>
        Update: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at' | 'customer' | 'assigned_user' | 'proposal' | 'invoice' | 'photos'>>
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'customer' | 'created_by_user' | 'job'>
        Update: Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'customer' | 'created_by_user' | 'job'>>
      }
      job_photos: {
        Row: JobPhoto
        Insert: Omit<JobPhoto, 'id' | 'created_at' | 'uploaded_by_user'>
        Update: Partial<Omit<JobPhoto, 'id' | 'created_at' | 'uploaded_by_user'>>
      }
      playbooks: {
        Row: Playbook
        Insert: Omit<Playbook, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Playbook, 'id' | 'created_at' | 'updated_at'>>
      }
      sms_logs: {
        Row: SmsLog
        Insert: Omit<SmsLog, 'id' | 'created_at'>
        Update: Partial<Omit<SmsLog, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      proposal_status: ProposalStatus
      job_status: JobStatus
      invoice_status: InvoiceStatus
      user_role: UserRole
      service_type: ServiceType
    }
  }
}

// ─── Helper Types ─────────────────────────────────────────────────────────

export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type ProposalInsert = Database['public']['Tables']['proposals']['Insert']
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update']

export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']

export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type JobPhotoInsert = Database['public']['Tables']['job_photos']['Insert']
export type JobPhotoUpdate = Database['public']['Tables']['job_photos']['Update']

export type PlaybookInsert = Database['public']['Tables']['playbooks']['Insert']
export type PlaybookUpdate = Database['public']['Tables']['playbooks']['Update']

export type SmsLogInsert = Database['public']['Tables']['sms_logs']['Insert']
