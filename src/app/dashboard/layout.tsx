import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const user = session.user as any

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userEmail={user.email ?? ''} userRole={user.role ?? 'VIEWER'} />
      <main className="ml-64 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
