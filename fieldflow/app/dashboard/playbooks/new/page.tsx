'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function NewPlaybookPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/playbooks')
      .then((r) => r.json())
      .then((data: Array<{ category?: string }>) => {
        if (Array.isArray(data)) {
          const cats = [...new Set(data.map((p) => p.category).filter(Boolean))] as string[]
          setExistingCategories(cats)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category: category.trim(), content }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create playbook')
      }
      const playbook = await res.json()
      toast.success('Playbook created')
      router.push(`/dashboard/playbooks/${playbook.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create playbook')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/playbooks"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to playbooks"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          New Playbook
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label" htmlFor="title">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            className="input"
            placeholder="e.g. HVAC Tune-Up SOP"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <input
            id="category"
            className="input"
            placeholder="e.g. HVAC, Plumbing, Onboarding"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {existingCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="content">
            Content
          </label>
          <p className="text-xs text-gray-400 mb-1">Markdown supported (# headings, **bold**, - lists)</p>
          <textarea
            id="content"
            className="input font-mono text-sm resize-y"
            placeholder="Write your playbook content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/playbooks" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 animate-spin"
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              'Save Playbook'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
