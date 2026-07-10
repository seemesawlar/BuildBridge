import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import StatusBadge from '../ui/StatusBadge'

export default function ChangeOrders({ projectId, userId, changeOrders, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [costDelta, setCostDelta] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('change_orders').insert({
      project_id: projectId,
      title,
      description,
      cost_delta: Number(costDelta) || 0,
      requested_by: userId,
    })
    setSaving(false)
    setShowForm(false)
    setTitle('')
    setDescription('')
    setCostDelta('')
    onChange()
  }

  const resolve = async (id, status) => {
    await supabase
      .from('change_orders')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq('id', id)
    onChange()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-blueprint">Change orders</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-xs">
          <Plus size={14} />
          Propose change
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-4 space-y-3 p-4">
          <input
            required
            placeholder="What's changing? e.g. Upgrade to tile flooring"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            required
            rows={2}
            placeholder="Reason for the change"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            required
            placeholder="Cost impact ($, use negative for a credit)"
            className="input"
            value={costDelta}
            onChange={(e) => setCostDelta(e.target.value)}
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Submitting…' : 'Submit for approval'}
          </button>
        </form>
      )}

      {changeOrders.length === 0 ? (
        <p className="text-sm text-slate">No change orders on this project — the original scope still stands.</p>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => (
            <div key={co.id} className="card p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <h4 className="font-semibold text-ink">{co.title}</h4>
                <StatusBadge status={co.status} />
              </div>
              <p className="mb-2 text-sm text-slate">{co.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-ink">
                  {co.cost_delta >= 0 ? '+' : ''}
                  ${Number(co.cost_delta).toLocaleString()}
                </span>
                {co.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(co.id, 'approved')}
                      className="flex items-center gap-1 rounded-sm bg-moss-light px-2.5 py-1 text-xs font-semibold text-moss hover:bg-moss/20"
                    >
                      <Check size={12} /> Approve
                    </button>
                    <button
                      onClick={() => resolve(co.id, 'rejected')}
                      className="flex items-center gap-1 rounded-sm bg-rust-light px-2.5 py-1 text-xs font-semibold text-rust hover:bg-rust/20"
                    >
                      <X size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
