import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-concrete">
        <p className="font-mono text-sm text-slate">Loading…</p>
      </div>
    )
  }

  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}
