'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      // Step 1: Create auth user and get session
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create account')

      // Step 2: Create company + user records server-side
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id, email, companyName, fullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete signup')

      toast.success('Account created! Redirecting...')
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
        Create your account
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline font-medium">Sign in</Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="label">Company name</label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="input"
            placeholder="Smith's HVAC"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="label">Your full name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="input"
            placeholder="John Smith"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
            placeholder="john@smithshvac.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input"
            placeholder="Re-enter your password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? 'Creating account...' : 'Create your account'}
        </button>
      </form>
    </div>
  )
}
