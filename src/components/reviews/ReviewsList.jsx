import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import StarRating from './StarRating'
import ReviewCard from './ReviewCard'

export default function ReviewsList({ contractorId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, client:profiles!reviews_client_id_fkey(full_name)')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }, [contractorId])

  useEffect(() => {
    load()
  }, [load])

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="font-display text-lg font-semibold text-blueprint">Reviews</h3>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1.5 font-mono text-sm text-slate">
            <StarRating value={Math.round(average)} readOnly size={14} />
            {average.toFixed(1)} ({reviews.length})
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-slate">Loading reviews…</p>}

      {!loading && reviews.length === 0 && (
        <p className="text-sm text-slate">No reviews yet.</p>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} clientName={r.client?.full_name || 'Client'} onChange={load} />
        ))}
      </div>
    </div>
  )
}
