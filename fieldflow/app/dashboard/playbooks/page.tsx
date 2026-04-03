import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string }
}) {
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

  let query = supabase
    .from('playbooks')
    .select('id, title, category, content, updated_at, created_at')
    .eq('company_id', userData!.company_id)
    .order('updated_at', { ascending: false })

  if (searchParams.category && searchParams.category !== 'all')
    query = query.eq('category', searchParams.category)
  if (searchParams.q)
    query = query.or(
      `title.ilike.%${searchParams.q}%,content.ilike.%${searchParams.q}%`
    )

  const { data: playbooks } = await query
  const categories = [
    'all',
    ...new Set((playbooks || []).map((p) => p.category).filter(Boolean)),
  ]
  const activeCategory = searchParams.category || 'all'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Playbooks
        </h1>
        <Link href="/dashboard/playbooks/new" className="btn-primary">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Playbook
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form method="GET" className="flex-1">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search playbooks..."
            className="input max-w-sm"
          />
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={
                cat === 'all'
                  ? '/dashboard/playbooks'
                  : `/dashboard/playbooks?category=${encodeURIComponent(cat)}`
              }
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  activeCategory === cat
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {!playbooks || playbooks.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
          title="No playbooks yet"
          description="Document your SOPs and best practices for your team."
          action={
            <Link href="/dashboard/playbooks/new" className="btn-primary">
              Create your first playbook
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/playbooks/${p.id}`}
              className="card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 flex-1 mr-2">{p.title}</h3>
                {p.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand flex-shrink-0">
                    {p.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                {p.content?.slice(0, 100).replace(/[#*`]/g, '') || 'No content yet'}
                {(p.content?.length || 0) > 100 ? '...' : ''}
              </p>
              <p className="text-xs text-gray-400">Updated {formatDate(p.updated_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
