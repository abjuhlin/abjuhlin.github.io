'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface CompanyData {
  id: string
  name: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
  primary_color?: string | null
}

interface OnboardingWizardProps {
  company: CompanyData
}

const TOTAL_STEPS = 5

export function OnboardingWizard({ company }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)

  // Form state
  const [companyName, setCompanyName] = useState(
    company.name && company.name !== 'My Company' ? company.name : ''
  )
  const [phone, setPhone] = useState(company.phone || '')
  const [email, setEmail] = useState(company.email || '')
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url || null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(company.primary_color || '#E86C3A')

  const logoInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function saveFields(fields: Record<string, unknown>) {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to save')
    }
    return res.json()
  }

  async function handleNext() {
    setSaving(true)
    try {
      if (step === 1) {
        if (!companyName.trim()) {
          toast.error('Please enter your company name')
          setSaving(false)
          return
        }
        await saveFields({ name: companyName.trim() })
      } else if (step === 2) {
        const fields: Record<string, string> = {}
        if (phone.trim()) fields.phone = phone.trim()
        if (email.trim()) fields.email = email.trim()
        if (Object.keys(fields).length > 0) {
          await saveFields(fields)
        }
      } else if (step === 4) {
        await saveFields({ primary_color: primaryColor })
      }

      setDirection('forward')
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    setDirection('back')
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      setLogoPreview(logo_url)
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed')
      setLogoPreview(company.logo_url || null)
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await fetch('/api/settings/onboarding', { method: 'POST' })
      setVisible(false)
      // Short delay for exit animation then reload
      setTimeout(() => {
        router.refresh()
      }, 300)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function handleSkipLogo() {
    setDirection('forward')
    setStep(4)
  }

  // Progress percentage
  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={containerRef}
        className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          />
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? 'w-6'
                  : i + 1 < step
                  ? 'w-2'
                  : 'w-2'
              }`}
              style={{
                backgroundColor:
                  i + 1 <= step ? primaryColor : '#E5E7EB',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 sm:px-8 py-6 min-h-[320px] flex flex-col">
          {/* Step 1: Welcome / Company Name */}
          {step === 1 && (
            <div className="flex-1 flex flex-col animate-fadeSlideIn">
              <div className="text-center mb-6">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'DM Serif Display, serif' }}
                >
                  Welcome to FieldFlow
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Let&apos;s get your account set up in just a few steps.
                </p>
              </div>

              <div className="flex-1">
                <label className="label" htmlFor="onboard-company-name">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="onboard-company-name"
                  className="input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme HVAC Services"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  This appears on invoices, estimates, and customer communications.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Phone & Email */}
          {step === 2 && (
            <div className="flex-1 flex flex-col animate-fadeSlideIn">
              <div className="text-center mb-6">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'DM Serif Display, serif' }}
                >
                  Contact Details
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  How can customers reach you?
                </p>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="label" htmlFor="onboard-phone">Phone</label>
                  <input
                    id="onboard-phone"
                    className="input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label" htmlFor="onboard-email">Email</label>
                  <input
                    id="onboard-email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@company.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNext()
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Logo Upload */}
          {step === 3 && (
            <div className="flex-1 flex flex-col animate-fadeSlideIn">
              <div className="text-center mb-6">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'DM Serif Display, serif' }}
                >
                  Company Logo
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Upload your logo for invoices and estimates. You can always add this later.
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div
                  className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />

                <button
                  type="button"
                  className="btn-secondary text-sm mt-4"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading...
                    </>
                  ) : logoPreview ? (
                    'Change Logo'
                  ) : (
                    'Choose File'
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 2MB</p>
              </div>
            </div>
          )}

          {/* Step 4: Brand Color */}
          {step === 4 && (
            <div className="flex-1 flex flex-col animate-fadeSlideIn">
              <div className="text-center mb-6">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h2
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'DM Serif Display, serif' }}
                >
                  Brand Color
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Choose a color that matches your brand. This is used across the app.
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-20 rounded-2xl border-2 border-gray-200 cursor-pointer p-1 bg-white shadow-sm"
                    title="Pick a color"
                  />
                  <div>
                    <input
                      className="input w-32 text-center font-mono"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      maxLength={7}
                      placeholder="#E86C3A"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 text-center">Hex color code</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 w-full max-w-xs">
                  <p className="text-xs text-gray-400 mb-2 text-center">Preview</p>
                  <div className="flex items-center gap-3 justify-center">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary Button
                    </button>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Status Badge
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: All Set */}
          {step === 5 && (
            <div className="flex-1 flex flex-col items-center justify-center animate-fadeSlideIn">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg className="w-8 h-8" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2
                className="text-2xl font-bold text-gray-900 text-center"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                You&apos;re All Set!
              </h2>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
                <span className="font-medium text-gray-700">{companyName}</span> is ready to go.
                Start by adding your first customer or creating a job.
              </p>
              <button
                type="button"
                className="btn-primary mt-8 px-8"
                onClick={handleFinish}
                disabled={saving}
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? 'Loading...' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        {step < 5 && (
          <div className="px-6 sm:px-8 pb-6 flex items-center justify-between">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleBack}
                  disabled={saving}
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 3 && (
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-2"
                  onClick={handleSkipLogo}
                  disabled={logoUploading}
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handleNext}
                disabled={saving || logoUploading}
                style={step === 4 ? { backgroundColor: primaryColor } : undefined}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : step === 3 ? (
                  'Next'
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.35s ease-out;
        }
      `}</style>
    </div>
  )
}
