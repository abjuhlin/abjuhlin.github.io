import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime, resolveJobStatus } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { JobStatusUpdate } from '@/components/jobs/JobStatusUpdate'
import { JobPhotos } from '@/components/jobs/JobPhotos'
import { InternalNotesEditor } from '@/components/jobs/InternalNotesEditor'

const STATUS_STEPS = ['scheduled', 'en_route', 'in_progress', 'complete'] as const

function StatusProgressBar({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus as (typeof STATUS_STEPS)[number])

  const stepLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    en_route: 'En Route',
    in_progress: 'In Progress',
    complete: 'Complete',
  }

  return (
    <div className="flex items-start mb-6">
      {STATUS_STEPS.map((step, idx) => {
        const isDone = currentIdx > idx
        const isCurrent = currentIdx === idx
        const isLast = idx === STATUS_STEPS.length - 1

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCurrent
                    ? 'bg-brand border-brand text-white'
                    : isDone
                    ? 'bg-brand/20 border-brand/40 text-brand'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  isCurrent ? 'text-brand' : isDone ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${
                  currentIdx > idx ? 'bg-brand/40' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      `
      *,
      customers ( id, full_name, phone, email, address, city, state, zip ),
      users!assigned_tech_id ( id, full_name, phone ),
      proposals ( id, proposal_number, line_items, total, subtotal, tax_rate, tax_amount, deposit_paid, deposit_amount ),
      job_photos ( id, public_url, photo_type, caption, created_at )
    `
    )
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !job) notFound()

  const customer = (job as any).customers as {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null

  const tech = (job as any).users as {
    id: string
    full_name: string
    phone: string | null
  } | null

  const proposalRaw = (job as any).proposals
  const proposal = Array.isArray(proposalRaw) ? proposalRaw[0] ?? null : proposalRaw ?? null

  const photos = ((job as any).job_photos ?? []) as Array<{
    id: string
    public_url: string
    photo_type: 'before' | 'after'
    caption: string | null
    created_at: string
  }>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                {job.title}
              </h1>
              <StatusBadge status={resolveJobStatus(job.status, job.scheduled_start)} />
              {!['paid'].includes(job.status) && (
                <Link
                  href={`/dashboard/jobs/${job.id}/edit`}
                  className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span className="font-mono text-brand font-medium">{job.job_number}</span>
              {customer && (
                <>
                  <span>·</span>
                  <span>{customer.full_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status progression bar — skip for terminal statuses */}
      {!['cancelled', 'invoiced', 'paid'].includes(job.status) && (
        <StatusProgressBar currentStatus={job.status} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left / main column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Job details */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              Job Details
            </h2>

            {job.description && (
              <div>
                <p className="label">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">Scheduled Start</p>
                <p className="text-gray-700">
                  {job.scheduled_start ? formatDateTime(job.scheduled_start) : '—'}
                </p>
              </div>
              <div>
                <p className="label">Scheduled End</p>
                <p className="text-gray-700">
                  {job.scheduled_end ? formatDateTime(job.scheduled_end) : '—'}
                </p>
              </div>
              {job.completed_at && (
                <div>
                  <p className="label">Completed At</p>
                  <p className="text-gray-700">{formatDateTime(job.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Address */}
            {(job.address || job.city) && (
              <div>
                <p className="label">Job Address</p>
                <p className="text-sm text-gray-700">
                  {[job.address, job.city, job.state, job.zip].filter(Boolean).join(', ')}
                </p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline mt-0.5 inline-block"
                >
                  Open in Maps
                </a>
              </div>
            )}

            {/* Tech */}
            <div>
              <p className="label">Assigned Technician</p>
              {tech ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">{tech.full_name}</span>
                  {tech.phone && (
                    <a href={`tel:${tech.phone}`} className="text-xs text-brand hover:underline">
                      {tech.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Unassigned</p>
              )}
            </div>

            {/* Proposal link */}
            {proposal && (
              <div>
                <p className="label">From Proposal</p>
                <Link
                  href={`/dashboard/proposals/${proposal.id}`}
                  className="text-sm text-brand hover:underline font-medium"
                >
                  {proposal.proposal_number}
                </Link>
              </div>
            )}
          </div>

          {/* Line items */}
          {proposal &&
            Array.isArray(proposal.line_items) &&
            proposal.line_items.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                    Line Items
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left py-2 px-5 font-medium text-gray-600">Description</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-600">Qty</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-600">Price</th>
                        <th className="text-right py-2 px-5 font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {proposal.line_items.map((item: any) => (
                        <tr key={item.id ?? item.description}>
                          <td className="py-2 px-5 text-gray-700">{item.description}</td>
                          <td className="py-2 px-4 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 px-4 text-right text-gray-600">
                            ${Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-2 px-5 text-right font-medium text-gray-900">
                            ${Number(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      {Number(proposal.tax_amount) > 0 && (
                        <tr>
                          <td colSpan={3} className="py-1.5 px-5 text-right text-gray-500 text-xs">
                            Subtotal
                          </td>
                          <td className="py-1.5 px-5 text-right text-gray-700 text-xs">
                            ${Number(proposal.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {Number(proposal.tax_amount) > 0 && (
                        <tr>
                          <td colSpan={3} className="py-1.5 px-5 text-right text-gray-500 text-xs">
                            Tax ({Number(proposal.tax_rate)}%)
                          </td>
                          <td className="py-1.5 px-5 text-right text-gray-700 text-xs">
                            ${Number(proposal.tax_amount).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="py-2 px-5 text-right font-semibold text-gray-900">
                          Total
                        </td>
                        <td className="py-2 px-5 text-right font-bold text-gray-900">
                          ${Number(proposal.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          {/* Internal notes — editable */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">
              Internal Notes
            </h2>
            <InternalNotesEditor
              jobId={job.id}
              initialNotes={job.internal_notes ?? ''}
            />
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Status update card */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">
              Update Status
            </h2>
            <div className="mb-3">
              <StatusBadge status={resolveJobStatus(job.status, job.scheduled_start)} />
            </div>
            <JobStatusUpdate jobId={job.id} currentStatus={job.status} />
          </div>

          {/* Proposal reference card */}
          {proposal && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">
                From Proposal
              </h2>
              <Link
                href={`/dashboard/proposals/${job.proposal_id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-brand/5 border border-gray-200 hover:border-brand/30 transition-colors"
              >
                <div>
                  <div className="font-mono text-sm font-semibold text-brand">{proposal.proposal_number}</div>
                  <div className="text-xs text-gray-500 mt-0.5">View original proposal →</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* Customer card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                Customer
              </h2>
              {customer && (
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="text-xs text-brand hover:underline"
                >
                  View profile
                </Link>
              )}
            </div>
            {customer ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-900">{customer.full_name}</p>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <a href={`tel:${customer.phone}`} className="text-brand hover:underline">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-brand hover:underline truncate"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-gray-600">
                      {[customer.address, customer.city, customer.state, customer.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No customer info</p>
            )}
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div className="card p-5 mt-6">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-4">
          Photos
        </h2>
        <JobPhotos
          jobId={job.id}
          companyId={userData.company_id}
          initialPhotos={photos}
        />
      </div>
    </div>
  )
}
