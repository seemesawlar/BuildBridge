import { Link } from 'react-router-dom'
import { ShieldCheck, MapPin, Briefcase, User, Star } from 'lucide-react'

export default function ContractorCard({ contractor }) {
  return (
    <Link
      to={`/contractors/${contractor.id}`}
      className="card flex flex-col gap-3 p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-line bg-concrete">
          {contractor.avatar_url ? (
            <img src={contractor.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate">
              <User size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold text-blueprint">
              {contractor.company_name || contractor.full_name}
            </h3>
            {contractor.is_verified && (
              <ShieldCheck size={14} className="flex-shrink-0 text-moss" />
            )}
          </div>
          {contractor.reviewCount > 0 ? (
            <div className="flex items-center gap-1 font-mono text-xs text-slate">
              <Star size={12} className="fill-amber text-amber" />
              {contractor.avgRating.toFixed(1)} ({contractor.reviewCount})
            </div>
          ) : (
            <p className="font-mono text-xs text-slate">No reviews yet</p>
          )}
        </div>
      </div>

      {contractor.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contractor.specialties.slice(0, 3).map((s) => (
            <span key={s} className="rounded-sm bg-line/50 px-2 py-0.5 text-xs font-medium text-ink">
              {s}
            </span>
          ))}
        </div>
      )}

      {contractor.bio && <p className="line-clamp-2 text-sm text-slate">{contractor.bio}</p>}

      <div className="mt-auto flex items-center gap-4 border-t border-line pt-3 font-mono text-xs text-slate">
        {contractor.service_area && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {contractor.service_area}
          </span>
        )}
        {contractor.years_experience != null && (
          <span className="flex items-center gap-1">
            <Briefcase size={12} /> {contractor.years_experience} yrs
          </span>
        )}
      </div>
    </Link>
  )
}
