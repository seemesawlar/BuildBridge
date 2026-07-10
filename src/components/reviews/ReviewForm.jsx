import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import StarRating from './StarRating'

export default function ReviewForm({ projectId, contractorId, clientId, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setError('Pick a star rating first.')
      return
    }
    setError('')
    setSaving(true)

    const { error: insertError } = await supabase.from('reviews').insert({
      project_id: projectId,
      contractor_id: contractorId,
      client_id: clientId,
      rating,
      body,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onSubmitted()
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <p className="label mb-2">Your rating</p>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>
      <div>
        <label className="label" htmlFor="review-body">Your review</label>
        <textarea
          id="review-body"
          rows={4}
          className="input"
          placeholder="How did the project go? Would you hire this contractor again?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error && <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
