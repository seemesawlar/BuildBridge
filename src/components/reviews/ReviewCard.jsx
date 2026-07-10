import { useState } from 'react'
import { Flag, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import StarRating from './StarRating'

export default function ReviewCard({ review, clientName, onChange }) {
  const { user, profile } = useAuth()
  const [responding, setResponding] = useState(false)
  const [responseText, setResponseText] = useState(review.contractor_response || '')
  const [saving, setSaving] = useState(false)
  const [reported, setReported] = useState(false)
  const [reportError, setReportError] = useState('')

  const isReviewedContractor = profile?.role === 'contractor' && user?.id === review.contractor_id

  const submitResponse = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('reviews')
      .update({ contractor_response: responseText })
      .eq('id', review.id)
    setSaving(false)
    setResponding(false)
    onChange?.()
  }

  const report = async () => {
    setReportError('')
    const { error } = await supabase
      .from('review_flags')
      .insert({ review_id: review.id, reporter_id: user.id })
    if (error) {
      setReportError(error.code === '23505' ? "You've already reported this review." : error.message)
      return
    }
    setReported(true)
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">{clientName}</p>
          <p className="font-mono text-xs text-slate">{new Date(review.created_at).toLocaleDateString()}</p>
        </div>
        <StarRating value={review.rating} readOnly size={16} />
      </div>

      {review.body && <p className="mb-3 text-sm text-ink">{review.body}</p>}

      {review.contractor_response && !responding && (
        <div className="mt-3 rounded-sm border-l-2 border-amber bg-amber/5 px-3 py-2">
          <p className="mb-1 font-mono text-xs uppercase tracking-wide text-amber-dark">Contractor response</p>
          <p className="text-sm text-ink">{review.contractor_response}</p>
        </div>
      )}

      {isReviewedContractor && !responding && (
        <button
          onClick={() => setResponding(true)}
          className="mt-3 text-xs font-semibold text-blueprint hover:text-amber-dark"
        >
          {review.contractor_response ? 'Edit response' : 'Respond to this review'}
        </button>
      )}

      {isReviewedContractor && responding && (
        <form onSubmit={submitResponse} className="mt-3 space-y-2">
          <textarea
            rows={3}
            className="input"
            placeholder="Thank the client, or clarify anything about the project…"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving…' : 'Save response'}
            </button>
            <button type="button" onClick={() => setResponding(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-3 flex items-center justify-end">
        {reported ? (
          <span className="flex items-center gap-1 font-mono text-xs text-slate">
            <ShieldAlert size={12} /> Reported
          </span>
        ) : (
          <button
            onClick={report}
            className="flex items-center gap-1 font-mono text-xs text-slate hover:text-rust"
          >
            <Flag size={12} /> Report
          </button>
        )}
      </div>
      {reportError && <p className="mt-1 text-right text-xs text-rust">{reportError}</p>}
    </div>
  )
}
