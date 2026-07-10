import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/ui/StatusBadge'
import MilestoneTimeline from '../components/project/MilestoneTimeline'

export default function SharedSummary() {
  const { token } = useParams()
  const [summary, setSummary] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('project_public_summary')
      .select('*')
      .eq('share_token', token)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          setNotFound(true)
          return
        }
        setSummary(data)
        const { data: ms } = await supabase
          .from('milestones')
          .select('*')
          .eq('project_id', data.id)
          .order('sort_order')
        setMilestones(ms || [])
      })
  }, [token])

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-concrete px-6">
        <p className="text-sm text-slate">This share link isn't valid or the project was removed.</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-concrete">
        <p className="font-mono text-sm text-slate">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-concrete">
      <div className="bg-blueprint bg-blueprint-grid bg-grid px-6 py-10 text-chalk">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <HardHat size={18} className="text-amber" />
          <span className="font-display text-sm font-semibold tracking-wide">BuildBridge</span>
          <span className="ml-auto font-mono text-xs text-chalk/50">Read-only summary</span>
        </div>
        <div className="mx-auto mt-6 max-w-2xl">
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={summary.status} />
          </div>
          <h1 className="font-display text-3xl font-semibold">{summary.title}</h1>
          <p className="mt-1 font-mono text-sm text-chalk/60">
            {summary.contractor_company || summary.contractor_name || 'Contractor not yet assigned'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="label mb-1">Budget</p>
            <p className="font-mono text-lg font-semibold text-ink">
              {summary.budget ? `$${Number(summary.budget).toLocaleString()}` : 'Not set'}
            </p>
          </div>
          <div className="card p-4">
            <p className="label mb-1">Target completion</p>
            <p className="font-mono text-lg font-semibold text-ink">
              {summary.target_end_date ? new Date(summary.target_end_date).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        <h2 className="mb-4 font-display text-lg font-semibold text-blueprint">Milestones</h2>
        <MilestoneTimeline milestones={milestones} />

        <p className="mt-10 text-center font-mono text-xs text-slate">
          This is a read-only view shared by the project owner.
        </p>
      </div>
    </div>
  )
}
