import { useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'milestone', label: 'Milestone payment' },
  { value: 'final', label: 'Final payment' },
  { value: 'other', label: 'Other' },
]

export default function PaymentsLedger({ projectId, userId, budget, payments, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const remaining = budget ? Number(budget) - totalPaid : null

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('payments').insert({
      project_id: projectId,
      recorded_by: userId,
      type,
      amount: Number(amount),
      note,
    })
    setSaving(false)
    setShowForm(false)
    setAmount('')
    setNote('')
    onChange()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-blueprint">Payments</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-xs">
          <Plus size={14} />
          Record payment
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="label mb-1">Total paid</p>
          <p className="font-mono text-xl font-semibold text-ink">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="label mb-1">Remaining balance</p>
          <p className="font-mono text-xl font-semibold text-ink">
            {remaining !== null ? `$${remaining.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-4 space-y-3 p-4">
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            required
            placeholder="Amount"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            placeholder="Note (optional)"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-slate">No payments recorded yet.</p>
      ) : (
        <div className="card divide-y divide-line">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize text-ink">{p.type}</p>
                <p className="font-mono text-xs text-slate">
                  {new Date(p.paid_at).toLocaleDateString()} {p.note ? `· ${p.note}` : ''}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-ink">
                ${Number(p.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
