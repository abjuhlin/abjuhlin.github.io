import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { MobileNav } from '@/components/dashboard/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, role, company_id, companies(id, name, primary_color, logo_url, google_review_url)')
    .eq('id', user.id)
    .single()

  const company = userData?.companies as any
  const primaryColor: string = company?.primary_color || '#E86C3A'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex md:flex-shrink-0">
        <SidebarNav user={userData as any} company={company} primaryColor={primaryColor} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <span
            className="text-xl font-bold text-gray-900"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            FieldFlow
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
