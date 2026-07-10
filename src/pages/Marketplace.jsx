import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ContractorCard from '../components/marketplace/ContractorCard'

const SORTS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'newest', label: 'Newest on BuildBridge' },
]

export default function Marketplace() {
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sort, setSort] = useState('rating')

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: reviews }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'contractor'),
        supabase.from('reviews').select('contractor_id, rating'),
      ])

      const ratingsByContractor = {}
      for (const r of reviews || []) {
        if (!ratingsByContractor[r.contractor_id]) ratingsByContractor[r.contractor_id] = []
        ratingsByContractor[r.contractor_id].push(r.rating)
      }

      const enriched = (profiles || []).map((c) => {
        const ratings = ratingsByContractor[c.id] || []
        const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
        return { ...c, avgRating, reviewCount: ratings.length }
      })

      setContractors(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const specialtyOptions = useMemo(() => {
    const all = new Set()
    contractors.forEach((c) => (c.specialties || []).forEach((s) => all.add(s)))
    return Array.from(all).sort()
  }, [contractors])

  const filtered = useMemo(() => {
    let list = contractors.filter((c) => {
      const haystack = `${c.company_name || ''} ${c.full_name} ${c.service_area || ''} ${(c.specialties || []).join(' ')}`.toLowerCase()
      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      const matchesSpecialty = !specialty || (c.specialties || []).includes(specialty)
      const matchesVerified = !verifiedOnly || c.is_verified
      return matchesSearch && matchesSpecialty && matchesVerified
    })

    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount
      if (sort === 'experience') return (b.years_experience || 0) - (a.years_experience || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return list
  }, [contractors, search, specialty, verifiedOnly, sort])

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="eyebrow">Find a contractor</p>
      <h1 className="mb-1 font-display text-3xl font-semibold text-blueprint">Browse contractors</h1>
      <p className="mb-8 max-w-2xl text-sm text-slate">
        Search by trade, area, or experience. Every profile shows verified license status and real
        client reviews — no cold calls, no guessing.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            className="input pl-9"
            placeholder="Search by name, area, or specialty…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">All specialties</option>
          {specialtyOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-ink">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 accent-amber"
          />
          <ShieldCheck size={14} className="text-moss" />
          Verified only
        </label>
      </div>

      {loading && <p className="font-mono text-sm text-slate">Loading contractors…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card px-8 py-14 text-center text-sm text-slate">
          No contractors match those filters yet.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((c) => (
          <ContractorCard key={c.id} contractor={c} />
        ))}
      </div>
    </div>
  )
}
