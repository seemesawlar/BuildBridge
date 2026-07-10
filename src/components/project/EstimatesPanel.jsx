import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import StatusBadge from '../ui/StatusBadge'

export default function EstimatesPanel({ projectId, userId, isContractor, estimates, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [labor, setLabor] = useState('')
  const [material, setMaterial] = useState('')
  const [other, setOther] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const nextVersion = (estimates[0]?.version || 0) + 1

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)

    // supersede the current active estimate, if any
    const current = estimates.find((e) => e.status === 'sent' || e.status === 'draft')
    if (current) {
      await supabase.from('estimates').update({ status: 'superseded' }).eq('id', current.id)
    }

    await supabase.from('estimates').insert({
      project_id: projectId,
      version: nextVersion,
      status: 'sent',
      labor_total: Number(labor) || 0,
      material_total: Number(material) || 0,
      other_total: Number(other) || 0,
      notes,
      created_by: userId,
    })

    setSaving(false)
    setShowForm(false)
    setLabor('')
    setMaterial('')
    setOther('')
    setNotes('')
    onChange()
  }

  const respond = async (id, status) => {
    await supabase
      .from('estimates')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
    onChange()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-blueprint">Estimates</h3>
        {isContractor && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-xs">
            <Plus size={14} />
            New estimate (v{nextVersion})
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-4 space-y-3 p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Labor</label>
              <input type="number" step="0.01" className="input" value={labor} onChange={(e) => setLabor(e.target.value)} />
            </div>
            <div>
              <label className="label">Materials</label>
              <input type="number" step="0.01" className="input" value={material} onChange={(e) => setMaterial(e.target.value)} />
            </div>
            <div>
              <label className="label">Other</label>
              <input type="number" step="0.01" className="input" value={other} onChange={(e) => setOther(e.target.value)} />
            </div>
          </div>
          <textarea
            rows={2}
            placeholder="Notes for the client"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Sending…' : 'Send estimate to client'}
          </button>
        </form>
      )}

      {estimates.length === 0 ? (
        <p className="text-sm text-slate">No estimates yet.</p>
      ) : (
        <div className="space-y-3">
          {estimates.map((est) => (
            <div key={est.id} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-slate">Version {est.version}</span>
                <StatusBadge status={est.status} />
              </div>
              <div className="mb-2 grid grid-cols-3 gap-2 font-mono text-xs text-slate">
                <span>Labor: ${Number(est.labor_total).toLocaleString()}</span>
                <span>Materials: ${Number(est.material_total).toLocaleString()}</span>
                <span>Other: ${Number(est.other_total).toLocaleString()}</span>
              </div>
              <p className="mb-2 font-mono text-lg font-semibold text-ink">
                ${Number(est.total).toLocaleString()}
              </p>
              {est.notes && <p className="mb-2 text-sm text-slate">{est.notes}</p>}

              {!isContractor && est.status === 'sent' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(est.id, 'accepted')}
                    className="flex items-center gap-1 rounded-sm bg-moss-light px-2.5 py-1 text-xs font-semibold text-moss hover:bg-moss/20"
                  >
                    <Check size={12} /> Accept
                  </button>
                  <button
                    onClick={() => respond(est.id, 'rejected')}
                    className="flex items-center gap-1 rounded-sm bg-rust-light px-2.5 py-1 text-xs font-semibold text-rust hover:bg-rust/20"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
