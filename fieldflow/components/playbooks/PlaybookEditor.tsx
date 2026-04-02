'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'

interface PlaybookData {
  id: string
  title: string
  category: string
  content: string
  updated_at: string
}

interface PlaybookEditorProps {
  initialPlaybook: PlaybookData
  existingCategories: string[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type TabView = 'edit' | 'preview'

export function PlaybookEditor({ initialPlaybook, existingCategories }: PlaybookEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialPlaybook.title)
  const [category, setCategory] = useState(initialPlaybook.category)
  const [content, setContent] = useState(initialPlaybook.content)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [activeTab, setActiveTab] = useState<TabView>('edit')
  const [editingTitle, setEditingTitle] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(initialPlaybook.updated_at)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  const save = useCallback(
    async (nextTitle: string, nextCategory: string, nextContent: string) => {
      setSaveStatus('saving')
      try {
        const res = await fetch(`/api/playbooks/${initialPlaybook.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: nextTitle,
            category: nextCategory,
            content: nextContent,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Save failed')
        }
        const updated = await res.json()
        setUpdatedAt(updated.updated_at)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: unknown) {
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Failed to save')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    },
    [initialPlaybook.id]
  )

  // Debounced auto-save: fires 1.5s after any change, skips the initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save(title, category, content)
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, category, content, save])

  // Focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  async function handleDelete() {
    if (
      !window.confirm(
        'Are you sure you want to delete this playbook? This action cannot be undone.'
      )
    )
      return

    setDeleting(true)
    try {
      const res = await fetch(`/api/playbooks/${initialPlaybook.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Playbook deleted')
      router.push('/dashboard/playbooks')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingTitle(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard/playbooks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          All Playbooks
        </Link>

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <span className="text-xs text-gray-400 select-none">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="w-3 h-3 animate-spin text-gray-400"
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
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-600 inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500">Save failed</span>
            )}
            {saveStatus === 'idle' && updatedAt && (
              <span>Updated {formatDate(updatedAt)}</span>
            )}
          </span>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        {/* Editable title */}
        <div className="mb-4">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="w-full text-3xl font-bold text-gray-900 border-b-2 border-brand bg-transparent focus:outline-none pb-1"
              style={{ fontFamily: 'DM Serif Display, serif' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled Playbook"
            />
          ) : (
            <button
              className="w-full text-left group"
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
            >
              <h1
                className="text-3xl font-bold text-gray-900 group-hover:text-brand transition-colors border-b-2 border-transparent group-hover:border-brand/30 pb-1"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                {title || 'Untitled Playbook'}
              </h1>
            </button>
          )}
        </div>

        {/* Category */}
        <div className="mb-6 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500 shrink-0">Category:</label>
          <input
            className="text-sm border border-gray-200 rounded-full px-3 py-1 bg-brand/5 text-brand focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            placeholder="Add category..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="editor-category-suggestions"
          />
          <datalist id="editor-category-suggestions">
            {existingCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0.5 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'edit'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'preview'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Edit tab */}
        {activeTab === 'edit' && (
          <div>
            <p className="text-xs text-gray-400 mb-2">
              Markdown supported: # Heading, **bold**, *italic*, - list item, `code`
            </p>
            <textarea
              className="input font-mono text-sm resize-y"
              placeholder="Write your playbook content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={24}
            />
          </div>
        )}

        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div className="min-h-64">
            {content.trim() ? (
              <article className="prose prose-sm max-w-none text-gray-800 prose-headings:font-semibold prose-headings:text-gray-900 prose-a:text-brand prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
                <ReactMarkdown>{content}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-gray-400 italic text-sm">Nothing to preview yet. Switch to Edit to add content.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
