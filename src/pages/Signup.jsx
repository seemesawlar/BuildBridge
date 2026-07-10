import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HardHat, Home, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Signup() {
  const [role, setRole] = useState('client')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        email,
        full_name: fullName,
      })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-concrete px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <HardHat size={22} className="text-amber-dark" />
          <span className="font-display text-xl font-semibold text-blueprint">BuildBridge</span>
        </div>

        <div className="card p-8">
          <h1 className="mb-1 font-display text-2xl font-semibold text-blueprint">Create your account</h1>
          <p className="mb-6 text-sm text-slate">Start a project or set up your contractor profile.</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors ${
                role === 'client'
                  ? 'border-amber bg-amber/10 text-blueprint'
                  : 'border-line text-slate hover:border-blueprint/30'
              }`}
            >
              <Home size={18} />
              I'm a client
            </button>
            <button
              type="button"
              onClick={() => setRole('contractor')}
              className={`flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors ${
                role === 'contractor'
                  ? 'border-amber bg-amber/10 text-blueprint'
                  : 'border-line text-slate hover:border-blueprint/30'
              }`}
            >
              <Wrench size={18} />
              I'm a contractor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                required
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Rivera"
              />
            </div>
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
                minLength={6}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blueprint hover:text-amber-dark">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
