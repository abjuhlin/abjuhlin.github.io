'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useRef, useEffect, useCallback } from 'react'

interface SearchInputProps {
  placeholder?: string
}

export function SearchInput({ placeholder = 'Search...' }: SearchInputProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQuery = searchParams.get('q') ?? ''

  // Keep the input value in sync when navigating
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== currentQuery) {
      inputRef.current.value = currentQuery
    }
  }, [currentQuery])

  const navigate = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set('q', value.trim())
      } else {
        params.delete('q')
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [searchParams, pathname, router]
  )

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const value = e.target.value
    timerRef.current = setTimeout(() => navigate(value), 350)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (timerRef.current) clearTimeout(timerRef.current)
    navigate(inputRef.current?.value ?? '')
  }

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = ''
    if (timerRef.current) clearTimeout(timerRef.current)
    navigate('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref={inputRef}
        name="q"
        type="text"
        defaultValue={currentQuery}
        onChange={handleInput}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      {/* Clear button - only visible when there is a query */}
      {currentQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  )
}
