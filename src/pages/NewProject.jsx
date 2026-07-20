import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { PROJECT_TYPE_SUGGESTIONS, buildMilestonesForType } from '../utils/milestoneTemplates'
import ComboInput from '../components/ui/ComboInput'

export default function NewProject() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state || {}

  const [form, setForm] = useState({
    title: '',
    project_type: prefill.projectType || 'Basement finish',
    description: prefill.description || '',
    budget: '',
    address: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        title: form.title,
        project_type: form.project_type,
        description: form.description,
        budget: form.budget || null,
        address: form.address,
        client_id: user.id,
        contractor_id: prefill.contractorId || null,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const milestones = buildMilestonesForType(form.project_type).map((m) => ({
      ...m,
      project_id: project.id,
    }))
    await supabase.from('milestones').insert(milestones)

    if (prefill.inquiryId) {
      await supabase
        .from('inquiries')
        .update({ status: 'accepted', project_id: project.id })
        .eq('id', prefill.inquiryId)
    }

    setLoading(false)
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <p className="eyebrow">New project</p>
      <h1 className="mb-1 font-display text-3xl font-semibold text-blueprint">
        Tell us about the job
      </h1>
      <p className="mb-8 text-sm text-slate">
        {prefill.contractorId
          ? "This project will be created with that contractor already attached, based on your accepted quote request."
          : "We'll set up a milestone timeline automatically based on the project type — you can adjust it any time."}
      </p>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="title">Project title</label>
          <input
            id="title"
            required
            className="input"
            placeholder="e.g. Basement finish — rec room + bath"
            value={form.title}
            onChange={update('title')}
          />
        </div>

        <div>
          <label className="label" htmlFor="project_type">Project type</label>
          <ComboInput
            id="project_type"
            value={form.project_type}
            onChange={update('project_type')}
            options={PROJECT_TYPE_SUGGESTIONS}
            placeholder="Pick a suggestion or type your own"
          />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            className="input"
            placeholder="What's the scope of the work?"
            value={form.description}
            onChange={update('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="budget">Budget (optional)</label>
            <input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              className="input"
              placeholder="25000"
              value={form.budget}
              onChange={update('budget')}
            />
          </div>
          <div>
            <label className="label" htmlFor="address">Address (optional)</label>
            <input
              id="address"
              className="input"
              placeholder="Property address"
              value={form.address}
              onChange={update('address')}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  )
}
