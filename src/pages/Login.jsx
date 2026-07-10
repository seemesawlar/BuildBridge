import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-blueprint bg-blueprint-grid bg-grid p-12 text-chalk lg:flex">
        <div className="flex items-center gap-2">
          <HardHat size={22} className="text-amber" />
          <span className="font-display text-xl font-semibold">BuildBridge</span>
        </div>
        <div>
          <p className="eyebrow mb-3 text-amber">The record every project deserves</p>
          <h1 className="max-w-md font-display text-4xl font-semibold leading-tight text-chalk">
            One shared timeline. Every estimate, change, and payment — dated and permanent.
          </h1>
        </div>
        <p className="font-mono text-xs text-chalk/40">
          Built for basements, decks, kitchens, and every job in between.
        </p>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 font-display text-2xl font-semibold text-blueprint">Welcome back</h2>
          <p className="mb-8 text-sm text-slate">Sign in to see what's happening on your projects.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-blueprint hover:text-amber-dark">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
