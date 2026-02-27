import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* Sidebar (desktop) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar session={session} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar session={session} />
        <main className="flex-1 overflow-auto bg-surface-base">
          {children}
        </main>
      </div>
    </div>
  )
}
