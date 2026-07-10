import { useEffect, useState } from 'react'
import { Plus, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile, getSignedUrl } from '../../lib/storage'

function ProgressPhoto({ path }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let active = true
    getSignedUrl('progress-photos', path)
      .then((signed) => active && setUrl(signed))
      .catch(() => active && setUrl(null))
    return () => {
      active = false
    }
  }, [path])

  if (!url) {
    return <div className="h-24 w-24 animate-pulse rounded-sm bg-line/50" />
  }
  return <img src={url} alt="Progress" className="h-24 w-24 rounded-sm object-cover" />
}

export default function ProgressLog({ projectId, userId, milestones, updates, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...picked].slice(0, 6))
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const uploaded = []
      for (const file of files) {
        const { path } = await uploadFile({
          bucket: 'progress-photos',
          folder: projectId,
          file,
          isPublic: false,
        })
        uploaded.push(path)
      }

      await supabase.from('progress_updates').insert({
        project_id: projectId,
        author_id: userId,
        milestone_id: milestoneId || null,
        note,
        photo_urls: uploaded,
      })

      setShowForm(false)
      setNote('')
      setFiles([])
      onChange()
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-blueprint">Progress log</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-xs">
          <Plus size={14} />
          Post update
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-4 space-y-3 p-4">
          <select className="input" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">General update (no milestone)</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            placeholder="What happened today?"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div>
            <label className="btn-secondary inline-flex cursor-pointer text-xs">
              <ImageIcon size={14} />
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilePick}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-16 w-16 rounded-sm object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rust text-chalk"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-sm bg-rust-light px-3 py-2 text-sm text-rust">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Uploading…' : 'Post update'}
          </button>
        </form>
      )}

      {updates.length === 0 ? (
        <p className="text-sm text-slate">No updates posted yet.</p>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-xs text-slate">
                  {new Date(u.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-ink">{u.note}</p>
              {u.photo_urls?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {u.photo_urls.map((path) => (
                    <ProgressPhoto key={path} path={path} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
