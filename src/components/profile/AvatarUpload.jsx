import { useState } from 'react'
import { User, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile } from '../../lib/storage'

export default function AvatarUpload({ userId, avatarUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { publicUrl } = await uploadFile({
        bucket: 'portfolio',
        folder: userId,
        file,
        isPublic: true,
      })
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      onUploaded(publicUrl)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-line bg-concrete">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate">
            <User size={28} />
          </div>
        )}
      </div>
      <div>
        <label className="btn-secondary inline-flex cursor-pointer text-xs">
          <Camera size={14} />
          {uploading ? 'Uploading…' : 'Change photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
        </label>
        {error && <p className="mt-1 text-xs text-rust">{error}</p>}
      </div>
    </div>
  )
}
