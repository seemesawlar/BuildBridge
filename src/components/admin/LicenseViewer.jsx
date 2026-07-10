import { useEffect, useState } from 'react'
import { getSignedUrl } from '../../lib/storage'

export default function LicenseViewer({ path }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    getSignedUrl('licenses', path)
      .then((signed) => active && setUrl(signed))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [path])

  if (error) return <p className="text-xs text-rust">Couldn't load document.</p>
  if (!url) return <div className="h-40 w-full animate-pulse rounded-sm bg-line/50" />

  const isPdf = path.toLowerCase().endsWith('.pdf')

  return isPdf ? (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blueprint underline">
      Open PDF document
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="License document" className="max-h-64 rounded-sm border border-line object-contain" />
    </a>
  )
}
