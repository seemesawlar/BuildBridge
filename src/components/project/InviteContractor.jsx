import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function InviteContractor({ projectId, onChange }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: contractor, error: lookupError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    if (lookupError || !contractor) {
      setError('No account found with that email. They need to sign up as a contractor first.')
      setLoading(false)
      return
    }

    await supabase.from('projects').update({ contractor_id: contractor.id }).eq('id', projectId)
    setLoading(false)
    setEmail('')
    onChange()
  }

  return (
    <form onSubmit={submit} className="card flex items-center gap-2 p-3">
      <input
        type="email"
        required
        placeholder="Contractor's email"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
        {loading ? 'Inviting…' : 'Invite'}
      </button>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  )
}
