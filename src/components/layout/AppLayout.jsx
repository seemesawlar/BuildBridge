import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus, LogOut, HardHat, UserCircle, ShieldCheck, Search, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../notifications/NotificationBell'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-chalk' : 'text-chalk/70 hover:bg-white/5'
  }`

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isContractor = profile?.role === 'contractor'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-concrete">
      <aside className="relative flex w-64 flex-col justify-between bg-blueprint bg-blueprint-grid bg-grid text-chalk">
        <div>
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
            <HardHat size={20} className="text-amber" strokeWidth={2} />
            <span className="font-display text-lg font-semibold tracking-tight">
              BuildBridge
            </span>
          </div>

          <nav className="mt-4 flex flex-col gap-1 px-3">
            <NavLink to="/" end className={linkClass}>
              <LayoutGrid size={16} />
              Projects
            </NavLink>
            {!isContractor && (
              <>
                <NavLink to="/contractors" className={linkClass}>
                  <Search size={16} />
                  Find contractors
                </NavLink>
                <NavLink to="/projects/new" className={linkClass}>
                  <Plus size={16} />
                  New project
                </NavLink>
              </>
            )}
            <NavLink to="/inquiries" className={linkClass}>
              <Send size={16} />
              Quote requests
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <UserCircle size={16} />
              My profile
            </NavLink>
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={linkClass}>
                <ShieldCheck size={16} />
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium">{profile?.full_name || 'Loading…'}</p>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-chalk/50">
            {profile?.role}
          </p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-chalk/70 transition-colors hover:text-amber"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-end border-b border-line bg-chalk px-8 py-3">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
