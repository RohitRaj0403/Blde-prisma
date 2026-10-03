'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, BookOpen, Users, Building2,
  BookMarked, Upload, BarChart3, LogOut, ChevronRight, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLDE_LOGO_DATA_URI } from '@/lib/logo'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/publications', label: 'Publications', icon: BookOpen },
  { href: '/authors', label: 'Authors', icon: Users },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/journals', label: 'Journals', icon: BookMarked },
  { href: '/import', label: 'Import Data', icon: Upload },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

const adminItems = [
  { href: '/admin/users', label: 'User Management', icon: ShieldCheck },
]

export default function Sidebar({ userEmail, userRole }: { userEmail: string; userRole: string }) {
  const pathname = usePathname()
  const isAdmin = userRole === 'ADMIN'

  return (
    <aside className="w-64 bg-blue-950 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-blue-800/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center shrink-0 shadow-sm border border-blue-900/50">
            <img src={BLDE_LOGO_DATA_URI} alt="BLDE Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-white group-hover:text-blue-200 transition-colors">BLDE-PRISM</div>
            <div className="text-blue-300 text-xs">Research Manager</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800/60 hover:text-white'
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-200 hover:bg-blue-800/60 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium uppercase">
            {userEmail[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-medium truncate">{userEmail}</div>
            <div className="text-xs text-blue-300 capitalize">{userRole.toLowerCase()}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-blue-800/60 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
