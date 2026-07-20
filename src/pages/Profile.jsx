import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import AvatarUpload from '../components/profile/AvatarUpload'
import LicenseUpload from '../components/profile/LicenseUpload'
import PortfolioGallery from '../components/profile/PortfolioGallery'

const emptyForm = {
  full_name: '',
  company_name: '',
  phone: '',
  service_area: '',
  years_experience: '',
  bio: '',
  specialties: '',
}

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const isContractor = profile?.role === 'contractor'

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const hydrated = useRef(false)

  // The profile can arrive after this component's first render (e.g.
  // right after signup, or on any slow connection) — `useState`'s
  // initializer only runs once, so without this the form would stay
  // blank forever even once `profile` shows up. Sync it in once, the
  // first time it becomes available.
  useEffect(() => {
    if (profile && !hydrated.current) {
      hydrated.current = true
      setForm({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        service_area: profile.service_area || '',
        years_experience: profile.years_experience || '',
        bio: profile.bio || '',
        specialties: (profile.specialties || []).join(', '),
      })
    }
  }, [profile])

  const handleRetry = async () => {
    setRetrying(true)
    await refreshProfile()
    setRetrying(false)
  }

  if (authLoading) {
    return <div className="px-8 py-10 font-mono text-sm text-slate">Loading…</div>
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-8 py-16 text-center">
        <p className="mb-2 font-display text-lg font-semibold text-blueprint">
          Couldn't load your profile
        </p>
        <p className="mb-5 text-sm text-slate">
          This can happen right after signing up, or after a network hiccup. Try again below.
        </p>
        <button onClick={handleRetry} disabled={retrying} className="btn-primary">
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    )
  }

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      ...(isContractor && {
        company_name: form.company_name,
        service_area: form.service_area,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        bio: form.bio,
        specialties: form.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    }

    await supabase.from('profiles').update(payload).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="eyebrow">Profile</p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-blueprint">
        {isContractor ? 'Your business profile' : 'Your profile'}
      </h1>

      <div className="card mb-6 p-6">
        <AvatarUpload
          userId={user.id}
          avatarUrl={profile.avatar_url}
          onUploaded={refreshProfile}
        />
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input id="full_name" className="input" value={form.full_name} onChange={update('full_name')} />
        </div>

        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" className="input" value={form.phone} onChange={update('phone')} />
        </div>

        {isContractor && (
          <>
            <div>
              <label className="label" htmlFor="company_name">Business name</label>
              <input id="company_name" className="input" value={form.company_name} onChange={update('company_name')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="service_area">Service area</label>
                <input
                  id="service_area"
                  className="input"
                  placeholder="e.g. Edmonton & surrounding area"
                  value={form.service_area}
                  onChange={update('service_area')}
                />
              </div>
              <div>
                <label className="label" htmlFor="years_experience">Years of experience</label>
                <input
                  id="years_experience"
                  type="number"
                  min="0"
                  className="input"
                  value={form.years_experience}
                  onChange={update('years_experience')}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="specialties">Specialties</label>
              <input
                id="specialties"
                className="input"
                placeholder="Basements, decks, kitchen remodels (comma separated)"
                value={form.specialties}
                onChange={update('specialties')}
              />
            </div>

            <div>
              <label className="label" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={4}
                className="input"
                placeholder="Tell clients about your business, your approach, and what makes your work stand out."
                value={form.bio}
                onChange={update('bio')}
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-moss">Saved</span>}
        </div>
      </form>

      {isContractor && (
        <>
          <div className="mt-6">
            <LicenseUpload
              userId={user.id}
              licenseUrl={profile.license_url}
              isVerified={profile.is_verified}
              onUploaded={refreshProfile}
            />
          </div>

          <div className="mt-8">
            <PortfolioGallery contractorId={user.id} editable />
          </div>
        </>
      )}
    </div>
  )
}
