import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, MapPin, Briefcase, User, Send, Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PortfolioGallery from '../components/profile/PortfolioGallery'
import ReviewsList from '../components/reviews/ReviewsList'
import InquiryForm from '../components/marketplace/InquiryForm'

export default function ContractorProfile() {
  const { id } = useParams()
  const { user, profile: viewerProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [inquirySent, setInquirySent] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'contractor')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setProfile(data)
      })
  }, [id])

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-concrete px-6">
        <p className="text-sm text-slate">This contractor profile couldn't be found.</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-concrete">
        <p className="font-mono text-sm text-slate">Loading…</p>
      </div>
    )
  }

  const canInquire = viewerProfile?.role === 'client' && user?.id !== profile.id

  return (
    <div className="min-h-screen bg-concrete">
      <div className="bg-blueprint px-6 py-12 text-chalk">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-chalk/60">
                  <User size={28} />
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">
                  {profile.company_name || profile.full_name}
                </h1>
                {profile.is_verified && (
                  <span className="flex items-center gap-1 rounded-sm bg-amber/20 px-2 py-0.5 text-xs font-semibold text-amber">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              <p className="font-mono text-sm text-chalk/60">{profile.full_name}</p>
            </div>
          </div>

          {canInquire && (
            <button
              onClick={() => setShowInquiryForm(true)}
              disabled={inquirySent}
              className="btn-amber whitespace-nowrap"
            >
              {inquirySent ? <Check size={16} /> : <Send size={16} />}
              {inquirySent ? 'Request sent' : 'Request a quote'}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-4">
          {profile.service_area && (
            <span className="flex items-center gap-1.5 text-sm text-slate">
              <MapPin size={14} /> {profile.service_area}
            </span>
          )}
          {profile.years_experience != null && (
            <span className="flex items-center gap-1.5 text-sm text-slate">
              <Briefcase size={14} /> {profile.years_experience} years experience
            </span>
          )}
        </div>

        {profile.specialties?.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {profile.specialties.map((s) => (
              <span key={s} className="rounded-sm bg-line/50 px-2.5 py-1 text-xs font-medium text-ink">
                {s}
              </span>
            ))}
          </div>
        )}

        {profile.bio && (
          <div className="card mb-8 p-5">
            <p className="text-sm leading-relaxed text-ink">{profile.bio}</p>
          </div>
        )}

        <PortfolioGallery contractorId={profile.id} editable={false} />

        <div className="mt-10">
          <ReviewsList contractorId={profile.id} />
        </div>
      </div>

      {showInquiryForm && (
        <InquiryForm
          contractorId={profile.id}
          clientId={user.id}
          onClose={() => setShowInquiryForm(false)}
          onSent={() => {
            setShowInquiryForm(false)
            setInquirySent(true)
          }}
        />
      )}
    </div>
  )
}
