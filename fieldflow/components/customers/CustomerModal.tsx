'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'

interface CustomerFormData {
  full_name: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
}

interface CustomerModalProps {
  companyId: string
  customerId?: string
  initialName?: string
  onClose: () => void
  onSuccess: (newCustomer?: any) => void
}

const INITIAL_FORM: CustomerFormData = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10
}

function validateEmail(email: string): boolean {
  if (!email) return true // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function CustomerModal({ companyId, customerId, initialName, onClose, onSuccess }: CustomerModalProps) {
  const [form, setForm] = useState<CustomerFormData>(() => ({
    ...INITIAL_FORM,
    full_name: initialName ?? '',
  }))
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!customerId)

  const isEdit = !!customerId

  // Fetch existing customer data for edit mode
  useEffect(() => {
    if (!customerId) return

    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`)
        if (!res.ok) throw new Error('Failed to load customer')
        const data = await res.json()
        setForm({
          full_name: data.full_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zip: data.zip ?? '',
          notes: data.notes ?? '',
        })
      } catch {
        setServerError('Could not load customer data.')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [customerId])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    // State field: uppercase and cap at 2 chars
    const sanitized = name === 'state' ? value.toUpperCase().slice(0, 2) : value

    setForm((prev) => ({ ...prev, [name]: sanitized }))

    // Clear field error on change
    if (errors[name as keyof CustomerFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: Partial<CustomerFormData> = {}

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required.'
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required.'
    } else if (!validatePhone(form.phone)) {
      newErrors.phone = 'Phone must contain at least 10 digits.'
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    setSubmitting(true)

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      notes: form.notes.trim() || null,
      ...(isEdit ? {} : { company_id: companyId }),
    }

    try {
      const url = isEdit ? `/api/customers/${customerId}` : '/api/customers'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      const responseData = await res.json().catch(() => null)
      onSuccess(responseData ?? undefined)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg
            className="animate-spin h-6 w-6 text-brand"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="label">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                value={form.full_name}
                onChange={handleChange}
                className={`input ${errors.full_name ? 'border-red-400 focus:ring-red-300 focus:border-red-400' : ''}`}
                placeholder="Jane Smith"
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="label">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                className={`input ${errors.phone ? 'border-red-400 focus:ring-red-300 focus:border-red-400' : ''}`}
                placeholder="(555) 555-5555"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'border-red-400 focus:ring-red-300 focus:border-red-400' : ''}`}
                placeholder="jane@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="label">
                Street Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                autoComplete="street-address"
                value={form.address}
                onChange={handleChange}
                className="input"
                placeholder="123 Main St"
              />
            </div>

            {/* City / State / ZIP */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label htmlFor="city" className="label">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={handleChange}
                  className="input"
                  placeholder="Springfield"
                />
              </div>
              <div className="col-span-1">
                <label htmlFor="state" className="label">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={handleChange}
                  maxLength={2}
                  className="input uppercase"
                  placeholder="IL"
                />
              </div>
              <div className="col-span-1">
                <label htmlFor="zip" className="label">
                  ZIP
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  autoComplete="postal-code"
                  value={form.zip}
                  onChange={handleChange}
                  className="input"
                  placeholder="62701"
                />
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <label htmlFor="notes" className="label">
                Internal Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="input resize-none"
                placeholder="Any internal notes about this customer..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Customer'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
