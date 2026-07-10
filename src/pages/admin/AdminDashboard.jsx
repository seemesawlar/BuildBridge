import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, FileCheck2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LicenseViewer from '../../components/admin/LicenseViewer'
import StarRating from '../../components/reviews/StarRating'

const TABS = ['Verification queue', 'Users', 'Projects', 'Flagged reviews']

const PROJECT_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'cancelled']
const ROLES = ['client', 'contractor', 'admin']

export default function AdminDashboard() {
  const [tab, setTab] = useState('Verification queue')
  const [contractors, setContractors] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [flaggedReviews, setFlaggedReviews] = useState([])

  const load = useCallback(async () => {
    const [{ data: contractorData }, { data: userData }, { data: projectData }, { data: flagData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'contractor')
        .not('license_url', 'is', null)
        .order('is_verified')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('*, client:profiles!projects_client_id_fkey(full_name), contractor:profiles!projects_contractor_id_fkey(full_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('review_flags')
        .select('*, review:reviews(*, client:profiles!reviews_client_id_fkey(full_name), contractor:profiles!reviews_contractor_id_fkey(full_name))')
        .order('created_at', { ascending: false }),
    ])
    setContractors(contractorData || [])
    setUsers(userData || [])
    setProjects(projectData || [])

    // group flags by review so a review reported multiple times shows once with a count
    const byReview = {}
    for (const flag of flagData || []) {
      if (!flag.review) continue
      if (!byReview[flag.review_id]) {
        byReview[flag.review_id] = { review: flag.review, count: 0, reasons: [] }
      }
      byReview[flag.review_id].count += 1
      if (flag.reason) byReview[flag.review_id].reasons.push(flag.reason)
    }
    setFlaggedReviews(Object.values(byReview))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setVerified = async (id, value) => {
    await supabase.from('profiles').update({ is_verified: value }).eq('id', id)
    load()
  }

  const setRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  const setProjectStatus = async (id, status) => {
    await supabase.from('projects').update({ status }).eq('id', id)
    load()
  }

  const deleteReview = async (reviewId) => {
    await supabase.from('reviews').delete().eq('id', reviewId)
    load()
  }

  const dismissFlags = async (reviewId) => {
    await supabase.from('review_flags').delete().eq('review_id', reviewId)
    load()
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-blueprint">Platform administration</h1>

      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? 'border-amber text-blueprint' : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Verification queue' && (
        <div className="space-y-4">
          {contractors.length === 0 && (
            <p className="text-sm text-slate">No contractors have uploaded a license yet.</p>
          )}
          {contractors.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">{c.company_name || c.full_name}</p>
                  <p className="font-mono text-xs text-slate">{c.email}</p>
                </div>
                {c.is_verified ? (
                  <span className="flex items-center gap-1 rounded-sm bg-moss-light px-2 py-0.5 text-xs font-semibold text-moss">
                    <ShieldCheck size={12} /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-sm bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber-dark">
                    <FileCheck2 size={12} /> Pending review
                  </span>
                )}
              </div>

              <div className="mb-4">
                <LicenseViewer path={c.license_url} />
              </div>

              <div className="flex gap-2">
                {!c.is_verified ? (
                  <button
                    onClick={() => setVerified(c.id, true)}
                    className="flex items-center gap-1.5 rounded-sm bg-moss-light px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss/20"
                  >
                    <ShieldCheck size={13} /> Approve & verify
                  </button>
                ) : (
                  <button
                    onClick={() => setVerified(c.id, false)}
                    className="flex items-center gap-1.5 rounded-sm bg-rust-light px-3 py-1.5 text-xs font-semibold text-rust hover:bg-rust/20"
                  >
                    <ShieldOff size={13} /> Revoke verification
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-ink">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-sm border border-line bg-chalk px-2 py-1 text-xs capitalize"
                      value={u.role}
                      onChange={(e) => setRole(u.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Projects' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contractor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-ink">{p.title}</td>
                  <td className="px-4 py-3 text-slate">{p.client?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-slate">{p.contractor?.full_name || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-sm border border-line bg-chalk px-2 py-1 text-xs capitalize"
                      value={p.status}
                      onChange={(e) => setProjectStatus(p.id, e.target.value)}
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'Flagged reviews' && (
        <div className="space-y-4">
          {flaggedReviews.length === 0 && (
            <p className="text-sm text-slate">No reviews have been reported.</p>
          )}
          {flaggedReviews.map(({ review, count }) => (
            <div key={review.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">
                    {review.client?.full_name || 'Client'} → {review.contractor?.full_name || 'Contractor'}
                  </p>
                  <p className="font-mono text-xs text-slate">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-sm bg-rust-light px-2 py-0.5 text-xs font-semibold text-rust">
                  {count} report{count > 1 ? 's' : ''}
                </span>
              </div>
              <div className="mb-3">
                <StarRating value={review.rating} readOnly size={14} />
              </div>
              {review.body && <p className="mb-3 text-sm text-ink">{review.body}</p>}
              {review.contractor_response && (
                <div className="mb-3 rounded-sm border-l-2 border-amber bg-amber/5 px-3 py-2">
                  <p className="mb-1 font-mono text-xs uppercase tracking-wide text-amber-dark">Contractor response</p>
                  <p className="text-sm text-ink">{review.contractor_response}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => dismissFlags(review.id)}
                  className="btn-secondary text-xs"
                >
                  Dismiss reports (keep review)
                </button>
                <button
                  onClick={() => deleteReview(review.id)}
                  className="flex items-center gap-1.5 rounded-sm bg-rust-light px-3 py-1.5 text-xs font-semibold text-rust hover:bg-rust/20"
                >
                  <Trash2 size={13} /> Remove review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
