import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-concrete">
        <p className="font-mono text-sm text-slate">Loading…</p>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
