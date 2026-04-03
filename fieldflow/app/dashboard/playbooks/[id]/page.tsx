import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { PlaybookEditor } from '@/components/playbooks/PlaybookEditor'

interface PlaybookPageProps {
  params: { id: string }
}

export default async function PlaybookPage({ params }: PlaybookPageProps) {
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

  const { data: playbook, error } = await supabase
    .from('playbooks')
    .select('id, title, category, content, created_at, updated_at')
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !playbook) notFound()

  // Fetch existing categories for the dropdown
  const { data: allPlaybooks } = await supabase
    .from('playbooks')
    .select('category')
    .eq('company_id', userData.company_id)

  const categories = [
    ...new Set((allPlaybooks || []).map((p) => p.category).filter(Boolean)),
  ] as string[]

  return (
    <PlaybookEditor
      initialPlaybook={{
        id: playbook.id,
        title: playbook.title,
        category: playbook.category ?? '',
        content: playbook.content ?? '',
        updated_at: playbook.updated_at,
      }}
      existingCategories={categories}
    />
  )
}
