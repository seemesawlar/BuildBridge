import { useState } from 'react'
import { FileCheck2, Upload, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile } from '../../lib/storage'

export default function LicenseUpload({ userId, licenseUrl, isVerified, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { path } = await uploadFile({
        bucket: 'licenses',
        folder: userId,
        file,
        isPublic: false,
      })
      await supabase.from('profiles').update({ license_url: path }).eq('id', userId)
      onUploaded(path)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-ink">License / certification</h4>
        {isVerified ? (
          <span className="flex items-center gap-1 rounded-sm bg-moss-light px-2 py-0.5 text-xs font-semibold text-moss">
            <ShieldCheck size={12} /> Verified
          </span>
        ) : (
          <span className="rounded-sm bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber-dark">
            Pending review
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-slate">
        Upload a business license or trade certification. It's kept private and only used to verify your
        account — a platform admin reviews it before your badge appears on your profile.
      </p>

      {licenseUrl && (
        <p className="mb-3 flex items-center gap-1.5 font-mono text-xs text-slate">
          <FileCheck2 size={13} className="text-moss" />
          Document on file
        </p>
      )}

      <label className="btn-secondary inline-flex cursor-pointer text-xs">
        <Upload size={14} />
        {uploading ? 'Uploading…' : licenseUrl ? 'Replace document' : 'Upload document'}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
    </div>
  )
}
