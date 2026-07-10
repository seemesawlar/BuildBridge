import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { PROJECT_TYPES } from '../../utils/milestoneTemplates'

export default function InquiryForm({ contractorId, clientId, onClose, onSent }) {
  const [projectType, setProjectType] = useState('basement')
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error: insertError } = await supabase.from('inquiries').insert({
      client_id: clientId,
      contractor_id: contractorId,
      project_type: projectType,
      message,
      budget: budget || null,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onSent()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-blueprint-dark/40 px-4">
      <div className="w-full max-w-md rounded-sm border border-line bg-chalk p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-blueprint">Request a quote</h3>
          <button onClick={onClose} className="text-slate hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate">
          This sends a non-binding request — the contractor can respond with questions or a rough
          quote before anything's official. A project is only created once you decide to proceed.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Project type</label>
            <select className="input" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tell them about the job</label>
            <textarea
              required
              rows={4}
              className="input"
              placeholder="What are you looking to have done? Any timeline in mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rough budget (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              placeholder="25000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          {error && <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Sending…' : 'Send request'}
          </button>
        </form>
      </div>
    </div>
  )
}
