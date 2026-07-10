import { useEffect, useState } from 'react'
import { Plus, Trash2, ImagePlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile, deleteFile } from '../../lib/storage'

export default function PortfolioGallery({ contractorId, editable }) {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    supabase
      .from('portfolio_images')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('sort_order')
      .then(({ data }) => setImages(data || []))
  }

  useEffect(load, [contractorId])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      for (const file of files) {
        const { publicUrl } = await uploadFile({
          bucket: 'portfolio',
          folder: contractorId,
          file,
          isPublic: true,
        })
        await supabase.from('portfolio_images').insert({
          contractor_id: contractorId,
          image_url: publicUrl,
          sort_order: images.length,
        })
      }
      load()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (image) => {
    // image_url is a public URL like {supabaseUrl}/storage/v1/object/public/portfolio/{contractorId}/{file}
    const marker = '/portfolio/'
    const idx = image.image_url.indexOf(marker)
    const path = idx >= 0 ? image.image_url.slice(idx + marker.length) : null

    await supabase.from('portfolio_images').delete().eq('id', image.id)
    if (path) {
      try {
        await deleteFile('portfolio', path)
      } catch {
        // non-fatal — the DB row is already gone, storage cleanup can lag
      }
    }
    load()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-blueprint">Previous work</h3>
        {editable && (
          <label className="btn-secondary inline-flex cursor-pointer text-xs">
            <ImagePlus size={14} />
            {uploading ? 'Uploading…' : 'Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-rust">{error}</p>}

      {images.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Plus className="text-slate" size={20} />
          <p className="text-sm text-slate">
            {editable
              ? 'Add photos of completed jobs so clients can see your work before they hire you.'
              : 'No portfolio photos yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-sm">
              <img src={img.image_url} alt={img.caption || 'Portfolio work'} className="h-full w-full object-cover" />
              {editable && (
                <button
                  onClick={() => handleDelete(img)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-blueprint/80 text-chalk opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
