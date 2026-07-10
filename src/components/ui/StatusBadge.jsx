const STYLES = {
  draft: 'bg-line/40 text-slate',
  active: 'bg-moss-light text-moss',
  in_progress: 'bg-moss-light text-moss',
  on_hold: 'bg-amber/15 text-amber-dark',
  completed: 'bg-blueprint/10 text-blueprint',
  complete: 'bg-blueprint/10 text-blueprint',
  cancelled: 'bg-rust-light text-rust',
  not_started: 'bg-line/40 text-slate',
  blocked: 'bg-rust-light text-rust',
  pending: 'bg-amber/15 text-amber-dark',
  approved: 'bg-moss-light text-moss',
  rejected: 'bg-rust-light text-rust',
  sent: 'bg-amber/15 text-amber-dark',
  accepted: 'bg-moss-light text-moss',
  superseded: 'bg-line/40 text-slate',
}

const LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_hold: 'On hold',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-line/40 text-slate'
  const label = LABELS[status] || status?.replace(/_/g, ' ')
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold capitalize ${style}`}>
      {label}
    </span>
  )
}
