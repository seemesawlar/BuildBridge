import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'

const STATUS_DOT = {
  complete: 'bg-moss border-moss',
  in_progress: 'bg-amber border-amber',
  blocked: 'bg-rust border-rust',
  not_started: 'bg-chalk border-line',
}

const STATUS_OPTIONS = ['not_started', 'in_progress', 'blocked', 'complete']

function MilestoneEditor({ milestone, onSave, onCancel }) {
  const [status, setStatus] = useState(milestone.status)
  const [pct, setPct] = useState(milestone.pct_complete)
  const [expectedDate, setExpectedDate] = useState(milestone.expected_date || '')
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      status,
      pct_complete: Number(pct),
      expected_date: expectedDate || null,
      completed_at: status === 'complete' ? new Date().toISOString() : null,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={save} className="card mt-2 space-y-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <select className="input text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          max="100"
          className="input text-xs"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          placeholder="% complete"
        />
      </div>
      <input
        type="date"
        className="input text-xs"
        value={expectedDate ? expectedDate.slice(0, 10) : ''}
        onChange={(e) => setExpectedDate(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function MilestoneTimeline({ milestones, editable = false, onUpdate }) {
  const [editingId, setEditingId] = useState(null)

  if (!milestones?.length) {
    return <p className="text-sm text-slate">No milestones yet.</p>
  }

  return (
    <div className="relative pl-8">
      {/* dimension spine */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-line" />

      <div className="space-y-6">
        {milestones.map((m, i) => (
          <div key={m.id} className="relative">
            {/* tick mark, like a dimension line callout */}
            <div className="absolute -left-8 top-0 flex items-center gap-2">
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${STATUS_DOT[m.status]}`}
              >
                {m.status === 'complete' && <Check size={11} className="text-chalk" strokeWidth={3} />}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="font-mono text-xs text-slate">
                  {String(i + 1).padStart(2, '0')}
                </span>{' '}
                <span
                  className={`font-display text-base font-semibold ${
                    m.status === 'not_started' ? 'text-slate' : 'text-blueprint'
                  }`}
                >
                  {m.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-mono text-xs text-slate">
                  {m.pct_complete}%
                </span>
                {editable && (
                  <button
                    onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                    className="text-slate hover:text-amber-dark"
                    aria-label="Edit milestone"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>

            {m.status !== 'not_started' && (
              <div className="mt-1.5 h-1 w-full max-w-xs rounded-full bg-line">
                <div
                  className="h-1 rounded-full bg-amber"
                  style={{ width: `${m.pct_complete}%` }}
                />
              </div>
            )}
            {m.expected_date && (
              <p className="mt-1 font-mono text-xs text-slate">
                Target: {new Date(m.expected_date).toLocaleDateString()}
              </p>
            )}

            {editable && editingId === m.id && (
              <MilestoneEditor
                milestone={m}
                onCancel={() => setEditingId(null)}
                onSave={async (updates) => {
                  await onUpdate(m.id, updates)
                  setEditingId(null)
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
