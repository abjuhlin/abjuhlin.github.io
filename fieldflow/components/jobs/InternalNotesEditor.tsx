'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface InternalNotesEditorProps {
  jobId: string
  initialNotes: string
}

export function InternalNotesEditor({ jobId, initialNotes }: InternalNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save notes')
      }
      setEditing(false)
      toast.success('Notes saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div>
        <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[2rem]">
          {notes ? notes : <span className="text-gray-400">No internal notes</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-2 text-xs text-brand hover:underline"
        >
          {notes ? 'Edit' : 'Add notes'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <textarea
        className="input min-h-[100px] resize-y text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        autoFocus
        placeholder="Internal notes visible to your team only..."
      />
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => {
            setNotes(initialNotes)
            setEditing(false)
          }}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
