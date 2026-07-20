import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE = {
  pending: 'bg-amber/15 text-amber-dark',
  responded: 'bg-moss-light text-moss',
  declined: 'bg-rust-light text-rust',
  accepted: 'bg-blueprint/10 text-blueprint',
  withdrawn: 'bg-line/40 text-slate',
}

function ContractorInquiryCard({ inquiry, onChange }) {
  const [responding, setResponding] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [saving, setSaving] = useState(false)

  const respond = async (status) => {
    setSaving(true)
    await supabase
      .from('inquiries')
      .update({ status, contractor_response: responseText || null, responded_at: new Date().toISOString() })
      .eq('id', inquiry.id)
    setSaving(false)
    setResponding(false)
    onChange()
  }

  const typeLabel = inquiry.project_type

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">{inquiry.client?.full_name || 'A client'}</p>
          <p className="eyebrow">{typeLabel}</p>
        </div>
        <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[inquiry.status]}`}>
          {inquiry.status}
        </span>
      </div>
      {inquiry.message && <p className="mb-2 text-sm text-ink">{inquiry.message}</p>}
      {inquiry.budget && (
        <p className="mb-3 font-mono text-xs text-slate">Rough budget: ${Number(inquiry.budget).toLocaleString()}</p>
      )}

      {inquiry.contractor_response && !responding && (
        <div className="mb-3 rounded-sm border-l-2 border-amber bg-amber/5 px-3 py-2">
          <p className="mb-1 font-mono text-xs uppercase tracking-wide text-amber-dark">Your response</p>
          <p className="text-sm text-ink">{inquiry.contractor_response}</p>
        </div>
      )}

      {inquiry.status === 'pending' && !responding && (
        <button onClick={() => setResponding(true)} className="btn-secondary text-xs">
          Respond
        </button>
      )}

      {responding && (
        <div className="space-y-2">
          <textarea
            rows={3}
            className="input"
            placeholder="Ask a question, give a rough quote, or explain your availability…"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
          />
          <div className="flex gap-2">
            <button disabled={saving} onClick={() => respond('responded')} className="btn-primary text-xs">
              {saving ? 'Sending…' : 'Send response'}
            </button>
            <button
              disabled={saving}
              onClick={() => respond('declined')}
              className="rounded-sm bg-rust-light px-3 py-1.5 text-xs font-semibold text-rust hover:bg-rust/20"
            >
              Decline
            </button>
            <button type="button" onClick={() => setResponding(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientInquiryCard({ inquiry, onChange }) {
  const navigate = useNavigate()
  const typeLabel = inquiry.project_type

  const withdraw = async () => {
    await supabase.from('inquiries').update({ status: 'withdrawn' }).eq('id', inquiry.id)
    onChange()
  }

  const startProject = () => {
    navigate('/projects/new', {
      state: {
        contractorId: inquiry.contractor_id,
        projectType: inquiry.project_type,
        description: inquiry.message,
        inquiryId: inquiry.id,
      },
    })
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">
            {inquiry.contractor?.company_name || inquiry.contractor?.full_name || 'A contractor'}
          </p>
          <p className="eyebrow">{typeLabel}</p>
        </div>
        <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[inquiry.status]}`}>
          {inquiry.status}
        </span>
      </div>
      {inquiry.message && <p className="mb-2 text-sm text-ink">{inquiry.message}</p>}

      {inquiry.contractor_response && (
        <div className="mb-3 rounded-sm border-l-2 border-amber bg-amber/5 px-3 py-2">
          <p className="mb-1 font-mono text-xs uppercase tracking-wide text-amber-dark">Their response</p>
          <p className="text-sm text-ink">{inquiry.contractor_response}</p>
        </div>
      )}

      <div className="flex gap-2">
        {inquiry.status === 'responded' && (
          <button onClick={startProject} className="btn-primary text-xs">
            Start a project with them
          </button>
        )}
        {['pending', 'responded'].includes(inquiry.status) && (
          <button onClick={withdraw} className="btn-secondary text-xs">
            Withdraw
          </button>
        )}
      </div>
    </div>
  )
}

export default function Inquiries() {
  const { user, profile } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const isContractor = profile?.role === 'contractor'

  const load = useCallback(async () => {
    const column = isContractor ? 'contractor_id' : 'client_id'
    const joinField = isContractor
      ? 'client:profiles!inquiries_client_id_fkey(full_name)'
      : 'contractor:profiles!inquiries_contractor_id_fkey(full_name, company_name)'

    const { data } = await supabase
      .from('inquiries')
      .select(`*, ${joinField}`)
      .eq(column, user.id)
      .order('created_at', { ascending: false })
    setInquiries(data || [])
    setLoading(false)
  }, [user, isContractor])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="eyebrow">{isContractor ? 'Inbound requests' : 'Sent requests'}</p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-blueprint">Quote requests</h1>

      {loading && <p className="font-mono text-sm text-slate">Loading…</p>}

      {!loading && inquiries.length === 0 && (
        <div className="card px-8 py-14 text-center text-sm text-slate">
          {isContractor
            ? "No quote requests yet. They'll show up here once a client finds you in the marketplace."
            : 'No requests sent yet. Browse contractors and request a quote to get started.'}
        </div>
      )}

      <div className="space-y-4">
        {inquiries.map((inq) =>
          isContractor ? (
            <ContractorInquiryCard key={inq.id} inquiry={inq} onChange={load} />
          ) : (
            <ClientInquiryCard key={inq.id} inquiry={inq} onChange={load} />
          )
        )}
      </div>
    </div>
  )
}
