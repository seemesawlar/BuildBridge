import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Link2, Check, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import MilestoneTimeline from '../components/project/MilestoneTimeline'
import EstimatesPanel from '../components/project/EstimatesPanel'
import ChangeOrders from '../components/project/ChangeOrders'
import ProgressLog from '../components/project/ProgressLog'
import PaymentsLedger from '../components/project/PaymentsLedger'
import MessagesPanel from '../components/project/MessagesPanel'
import InviteContractor from '../components/project/InviteContractor'
import ReviewForm from '../components/reviews/ReviewForm'
import ReviewCard from '../components/reviews/ReviewCard'
import { PROJECT_TYPES } from '../utils/milestoneTemplates'

const TABS = ['Overview', 'Estimates', 'Change orders', 'Progress', 'Payments', 'Messages', 'Review']

export default function ProjectDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const [project, setProject] = useState(null)
  const [contractor, setContractor] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [estimates, setEstimates] = useState([])
  const [changeOrders, setChangeOrders] = useState([])
  const [progressUpdates, setProgressUpdates] = useState([])
  const [payments, setPayments] = useState([])
  const [messages, setMessages] = useState([])
  const [review, setReview] = useState(null)
  const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Overview'
  const [tab, setTab] = useState(initialTab)
  const [copied, setCopied] = useState(false)

  const changeTab = (t) => {
    setTab(t)
    setSearchParams(t === 'Overview' ? {} : { tab: t }, { replace: true })
  }

  const load = useCallback(async () => {
    const [
      { data: projectData },
      { data: milestoneData },
      { data: estimateData },
      { data: changeOrderData },
      { data: progressData },
      { data: paymentData },
      { data: messageData },
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('milestones').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('estimates').select('*').eq('project_id', id).order('version', { ascending: false }),
      supabase.from('change_orders').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('progress_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('project_id', id).order('paid_at', { ascending: false }),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at', { ascending: true }),
    ])

    setProject(projectData)
    setMilestones(milestoneData || [])
    setEstimates(estimateData || [])
    setChangeOrders(changeOrderData || [])
    setProgressUpdates(progressData || [])
    setPayments(paymentData || [])
    setMessages(messageData || [])

    if (projectData?.contractor_id) {
      const { data: contractorData } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, is_verified')
        .eq('id', projectData.contractor_id)
        .maybeSingle()
      setContractor(contractorData)

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, client:profiles!reviews_client_id_fkey(full_name)')
        .eq('project_id', id)
        .maybeSingle()
      setReview(reviewData)
    } else {
      setContractor(null)
      setReview(null)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!project) {
    return <div className="px-8 py-10 font-mono text-sm text-slate">Loading project…</div>
  }

  const isContractor = profile?.role === 'contractor'
  const typeLabel = PROJECT_TYPES.find((t) => t.value === project.project_type)?.label

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/${project.share_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">{typeLabel}</p>
        <StatusBadge status={project.status} />
      </div>
      <h1 className="mb-1 font-display text-3xl font-semibold text-blueprint">{project.title}</h1>
      <p className="mb-6 max-w-2xl text-sm text-slate">{project.description}</p>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button onClick={copyShareLink} className="btn-secondary text-xs">
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? 'Link copied' : 'Copy shareable summary link'}
        </button>
        {!project.contractor_id && !isContractor && (
          <InviteContractor projectId={project.id} onChange={load} />
        )}
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-amber text-blueprint'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-semibold text-blueprint">Milestones</h3>
            <MilestoneTimeline
              milestones={milestones}
              editable
              onUpdate={async (milestoneId, updates) => {
                await supabase.from('milestones').update(updates).eq('id', milestoneId)
                load()
              }}
            />
          </div>
          <div className="space-y-4">
            <div className="card p-4">
              <p className="label mb-1">Status</p>
              <select
                className="input"
                value={project.status}
                onChange={async (e) => {
                  await supabase.from('projects').update({ status: e.target.value }).eq('id', project.id)
                  load()
                }}
              >
                {['draft', 'active', 'on_hold', 'completed', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="card p-4">
              <p className="label mb-1">Budget</p>
              <p className="font-mono text-lg font-semibold text-ink">
                {project.budget ? `$${Number(project.budget).toLocaleString()}` : 'Not set'}
              </p>
            </div>
            {contractor && (
              <Link to={`/contractors/${contractor.id}`} className="card block p-4 transition-colors hover:border-amber/50">
                <p className="label mb-1">Contractor</p>
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {contractor.company_name || contractor.full_name}
                  {contractor.is_verified && <ShieldCheck size={13} className="text-moss" />}
                </p>
              </Link>
            )}
            <div className="card p-4">
              <p className="label mb-1">Address</p>
              <p className="text-sm text-ink">{project.address || '—'}</p>
            </div>
            <div className="card p-4">
              <p className="label mb-1">Change orders</p>
              <p className="font-mono text-lg font-semibold text-ink">
                {changeOrders.filter((c) => c.status === 'pending').length} pending
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'Estimates' && (
        <EstimatesPanel
          projectId={project.id}
          userId={user.id}
          isContractor={isContractor}
          estimates={estimates}
          onChange={load}
        />
      )}

      {tab === 'Change orders' && (
        <ChangeOrders
          projectId={project.id}
          userId={user.id}
          changeOrders={changeOrders}
          onChange={load}
        />
      )}

      {tab === 'Progress' && (
        <ProgressLog
          projectId={project.id}
          userId={user.id}
          milestones={milestones}
          updates={progressUpdates}
          onChange={load}
        />
      )}

      {tab === 'Payments' && (
        <PaymentsLedger
          projectId={project.id}
          userId={user.id}
          budget={project.budget}
          payments={payments}
          onChange={load}
        />
      )}

      {tab === 'Messages' && (
        <div className="card h-[500px] p-4">
          <MessagesPanel projectId={project.id} userId={user.id} messages={messages} onChange={load} />
        </div>
      )}

      {tab === 'Review' && (
        <div className="mx-auto max-w-xl">
          {!contractor && (
            <p className="text-sm text-slate">
              A review can be left once a contractor is assigned and the project is marked complete.
            </p>
          )}
          {contractor && review && (
            <ReviewCard review={review} clientName={review.client?.full_name || 'Client'} onChange={load} />
          )}
          {contractor && !review && project.status === 'completed' && !isContractor && (
            <ReviewForm
              projectId={project.id}
              contractorId={contractor.id}
              clientId={user.id}
              onSubmitted={load}
            />
          )}
          {contractor && !review && project.status === 'completed' && isContractor && (
            <p className="text-sm text-slate">The client hasn't left a review yet.</p>
          )}
          {contractor && !review && project.status !== 'completed' && (
            <p className="text-sm text-slate">
              Reviews unlock once this project's status is set to "Completed".
            </p>
          )}
        </div>
      )}
    </div>
  )
}
