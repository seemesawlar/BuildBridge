import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight, FolderKanban } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const column = profile?.role === 'contractor' ? 'contractor_id' : 'client_id'
    supabase
      .from('projects')
      .select('*')
      .eq(column, user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data || [])
        setLoading(false)
      })
  }, [user, profile])

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow">Projects</p>
          <h1 className="font-display text-3xl font-semibold text-blueprint">
            {profile?.role === 'contractor' ? 'Your active jobs' : 'Your projects'}
          </h1>
        </div>
        <Link to="/projects/new" className="btn-amber">
          <Plus size={16} />
          New project
        </Link>
      </div>

      {loading && <p className="font-mono text-sm text-slate">Loading projects…</p>}

      {!loading && projects.length === 0 && (
        <div className="card flex flex-col items-center gap-3 px-8 py-16 text-center">
          <FolderKanban className="text-slate" size={28} />
          <h2 className="font-display text-lg font-semibold text-blueprint">
            No projects yet
          </h2>
          <p className="max-w-sm text-sm text-slate">
            {profile?.role === 'contractor'
              ? 'Once a client invites you to a project, or you create one on their behalf, it will show up here.'
              : "Start a project and invite your contractor. Every estimate, update, and payment will live in one dated record from day one."}
          </p>
          <Link to="/projects/new" className="btn-primary mt-2">
            <Plus size={16} />
            Create your first project
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="eyebrow">{project.project_type}</p>
              <StatusBadge status={project.status} />
            </div>
            <h3 className="font-display text-lg font-semibold text-blueprint">
              {project.title}
            </h3>
            <p className="line-clamp-2 text-sm text-slate">{project.description}</p>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
              <span className="font-mono text-sm text-ink">
                {project.budget ? `$${Number(project.budget).toLocaleString()}` : 'No budget set'}
              </span>
              <ArrowRight
                size={16}
                className="text-slate transition-transform group-hover:translate-x-1 group-hover:text-amber-dark"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
