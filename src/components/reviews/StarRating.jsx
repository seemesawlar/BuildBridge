import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating({ value, onChange, size = 18, readOnly = false }) {
  const [hover, setHover] = useState(0)
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = readOnly ? n <= value : n <= (hover || value)
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer'}
          >
            <Star
              size={size}
              className={filled ? 'fill-amber text-amber' : 'fill-transparent text-line'}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}
