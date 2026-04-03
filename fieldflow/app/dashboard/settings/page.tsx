'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'

type Tab = 'company' | 'reviews' | 'team' | 'notifications'

interface CompanySettings {
  name: string
  phone: string
  email: string
  logo_url: string | null
  primary_color: string
  proposal_footer: string
  invoice_footer: string
  google_review_url: string
  review_request_delay_hours: number
}

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'owner' | 'admin' | 'tech'
  phone: string | null
}

interface NotificationSettings {
  notify_dispatch: boolean
  notify_reminder_24h: boolean
  notify_reminder_1h: boolean
  notify_review_request: boolean
}

const DELAY_OPTIONS = [1, 2, 4, 6, 12, 24]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Company profile
  const [company, setCompany] = useState<CompanySettings>({
    name: '',
    phone: '',
    email: '',
    logo_url: null,
    primary_color: '#E86C3A',
    proposal_footer: '',
    invoice_footer: '',
    google_review_url: '',
    review_request_delay_hours: 2,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>({
    notify_dispatch_sms: false,
    notify_24h_reminder: false,
    notify_1h_reminder: false,
    notify_review_request: false,
  })

  // Team
  const [team, setTeam] = useState<TeamMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    role: 'tech' as 'owner' | 'admin' | 'tech',
    phone: '',
  })
  const [inviting, setInviting] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editForm, setEditForm] = useState({ role: 'tech' as 'owner' | 'admin' | 'tech', phone: '' })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, settingsRes, teamRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/settings'),
          fetch('/api/team'),
        ])

        if (meRes.ok) {
          const me = await meRes.json()
          setCurrentUserId(me.id || '')
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setCompany({
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            logo_url: data.logo_url || null,
            primary_color: data.primary_color || '#E86C3A',
            proposal_footer: data.proposal_footer || '',
            invoice_footer: data.invoice_footer || '',
            google_review_url: data.google_review_url || '',
            review_request_delay_hours: data.review_request_delay_hours || 2,
          })
          setLogoPreview(data.logo_url || null)
          setNotifications({
            notify_dispatch_sms: data.notify_dispatch_sms ?? false,
            notify_24h_reminder: data.notify_24h_reminder ?? false,
            notify_1h_reminder: data.notify_1h_reminder ?? false,
            notify_review_request: data.notify_review_request ?? false,
          })
        }

        if (teamRes.ok) {
          const members = await teamRes.json()
          setTeam(members || [])
        }
      } catch (err) {
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)
    setLogoUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const { logo_url } = await res.json()
      setCompany((prev) => ({ ...prev, logo_url }))
      setLogoPreview(logo_url)
      toast.success('Logo updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed')
      setLogoPreview(company.logo_url)
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function saveCompanyProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: company.name,
          phone: company.phone,
          email: company.email,
          primary_color: company.primary_color,
          proposal_footer: company.proposal_footer,
          invoice_footer: company.invoice_footer,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      toast.success('Company profile saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function saveGoogleReviews() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_review_url: company.google_review_url,
          review_request_delay_hours: company.review_request_delay_hours,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      toast.success('Review settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function saveNotifications() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      toast.success('Notification settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (inviteForm.role === 'tech' && !inviteForm.phone.trim()) {
      toast.error('Phone is required for technicians')
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Invite failed')
      toast.success(`Invitation sent to ${inviteForm.email}`)
      setInviteOpen(false)
      setInviteForm({ full_name: '', email: '', role: 'tech', phone: '' })
      // Refresh team
      const teamRes = await fetch('/api/team')
      if (teamRes.ok) setTeam(await teamRes.json())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  function openEditMember(member: TeamMember) {
    setEditingMember(member)
    setEditForm({ role: member.role, phone: member.phone || '' })
  }

  async function saveEditMember(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/team/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editForm.role, phone: editForm.phone }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed')
      toast.success('Member updated')
      setTeam((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? { ...m, role: editForm.role, phone: editForm.phone || null }
            : m
        )
      )
      setEditingMember(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setEditSaving(false)
    }
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm(`Remove ${member.full_name} from your team?`)) return
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Remove failed')
      toast.success(`${member.full_name} removed`)
      setTeam((prev) => prev.filter((m) => m.id !== member.id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'company', label: 'Company Profile' },
    { id: 'reviews', label: 'Google Reviews' },
    { id: 'team', label: 'Team Members' },
    { id: 'notifications', label: 'Notifications' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-6 h-6 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-3xl font-bold text-gray-900 mb-6"
        style={{ fontFamily: 'DM Serif Display, serif' }}
      >
        Settings
      </h1>

      {/* Tab nav */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Company Profile */}
      {activeTab === 'company' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Company Profile</h2>

          {/* Logo */}
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? 'Uploading...' : 'Change Logo'}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="company-name">Company Name</label>
              <input
                id="company-name"
                className="input"
                value={company.name}
                onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))}
                placeholder="Acme HVAC Co."
              />
            </div>
            <div>
              <label className="label" htmlFor="company-phone">Phone</label>
              <input
                id="company-phone"
                className="input"
                type="tel"
                value={company.phone}
                onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="label" htmlFor="company-email">Email</label>
              <input
                id="company-email"
                className="input"
                type="email"
                value={company.email}
                onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))}
                placeholder="hello@company.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="primary-color">Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  className="input flex-1"
                  value={company.primary_color}
                  onChange={(e) => setCompany((p) => ({ ...p, primary_color: e.target.value }))}
                  placeholder="#E86C3A"
                  maxLength={7}
                />
                <input
                  type="color"
                  value={company.primary_color}
                  onChange={(e) => setCompany((p) => ({ ...p, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                  title="Pick a color"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="proposal-footer">Default Proposal Terms / Footer</label>
            <textarea
              id="proposal-footer"
              className="input resize-y"
              rows={3}
              value={company.proposal_footer}
              onChange={(e) => setCompany((p) => ({ ...p, proposal_footer: e.target.value }))}
              placeholder="Payment due within 30 days..."
            />
          </div>

          <div>
            <label className="label" htmlFor="invoice-footer">Default Invoice Footer</label>
            <textarea
              id="invoice-footer"
              className="input resize-y"
              rows={3}
              value={company.invoice_footer}
              onChange={(e) => setCompany((p) => ({ ...p, invoice_footer: e.target.value }))}
              placeholder="Thank you for your business!"
            />
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={saveCompanyProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Google Reviews */}
      {activeTab === 'reviews' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Google Reviews</h2>
          <p className="text-sm text-gray-500">
            Automatically send review request SMS messages to customers after a job is marked complete.
          </p>

          <div>
            <label className="label" htmlFor="review-url">Google Review URL</label>
            <input
              id="review-url"
              className="input"
              type="url"
              value={company.google_review_url}
              onChange={(e) => setCompany((p) => ({ ...p, google_review_url: e.target.value }))}
              placeholder="https://g.page/r/..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Find your review link in Google Business Profile → Ask for reviews → Get more reviews.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="review-delay">Send Review Request After</label>
            <select
              id="review-delay"
              className="input"
              value={company.review_request_delay_hours}
              onChange={(e) =>
                setCompany((p) => ({
                  ...p,
                  review_request_delay_hours: Number(e.target.value),
                }))
              }
            >
              {DELAY_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? 'hour' : 'hours'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={saveGoogleReviews} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Team Members */}
      {activeTab === 'team' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <button className="btn-primary" onClick={() => setInviteOpen(true)}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Team Member
            </button>
          </div>

          {team.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No team members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Name</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Email</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Role</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Phone</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {member.full_name}
                        {member.id === currentUserId && (
                          <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{member.email}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{member.phone || '—'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEditMember(member)}
                            className="text-xs text-gray-500 hover:text-brand transition-colors"
                          >
                            Edit
                          </button>
                          {member.id !== currentUserId && (
                            <button
                              onClick={() => removeMember(member)}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">
            Configure which automated SMS messages are sent to your customers.
          </p>

          <div className="space-y-4">
            {[
              {
                key: 'notify_dispatch_sms' as const,
                label: 'Dispatch SMS',
                description: "Send a text to the customer when a technician is dispatched.",
              },
              {
                key: 'notify_24h_reminder' as const,
                label: '24-Hour Reminder',
                description: 'Remind the customer 24 hours before their scheduled appointment.',
              },
              {
                key: 'notify_1h_reminder' as const,
                label: '1-Hour Reminder',
                description: 'Remind the customer 1 hour before their scheduled appointment.',
              },
              {
                key: 'notify_review_request' as const,
                label: 'Review Request',
                description: 'Send a Google review request after a job is completed.',
              },
            ].map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) =>
                      setNotifications((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand/30 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={saveNotifications} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        description="They'll receive an email invitation to join your workspace."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="label" htmlFor="invite-name">Full Name <span className="text-red-500">*</span></label>
            <input
              id="invite-name"
              className="input"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-email">Email <span className="text-red-500">*</span></label>
            <input
              id="invite-email"
              className="input"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="jane@company.com"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              className="input"
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((p) => ({ ...p, role: e.target.value as typeof inviteForm.role }))
              }
            >
              <option value="tech">Technician</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="invite-phone">
              Phone{inviteForm.role === 'tech' && <span className="text-red-500"> *</span>}
            </label>
            <input
              id="invite-phone"
              className="input"
              type="tel"
              value={inviteForm.phone}
              onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(555) 000-0000"
              required={inviteForm.role === 'tech'}
            />
          </div>
          <div className="flex gap-3 pt-2 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={editingMember ? `Edit ${editingMember.full_name}` : ''}
      >
        <form onSubmit={saveEditMember} className="space-y-4">
          <div>
            <label className="label" htmlFor="edit-role">Role</label>
            <select
              id="edit-role"
              className="input"
              value={editForm.role}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, role: e.target.value as typeof editForm.role }))
              }
            >
              <option value="tech">Technician</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-phone">Phone</label>
            <input
              id="edit-phone"
              className="input"
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(555) 000-0000"
            />
          </div>
          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditingMember(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
