import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { notificationLink } from '../../lib/notifications'

const TYPE_DOT = {
  estimate: 'bg-amber',
  change_order: 'bg-rust',
  progress_update: 'bg-moss',
  payment: 'bg-blueprint',
  message: 'bg-blueprint',
  review: 'bg-amber',
  milestone: 'bg-moss',
  invite: 'bg-blueprint',
  inquiry: 'bg-amber',
  verification: 'bg-moss',
}

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!user) return

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications(data || []))

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new, ...prev])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (n) => {
    setOpen(false)
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    }
    navigate(notificationLink(n))
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-sm text-slate transition-colors hover:bg-line/40 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 font-mono text-[10px] font-semibold text-chalk">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-sm border border-line bg-chalk shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-semibold text-blueprint">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 font-mono text-xs text-slate hover:text-blueprint"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate">You're all caught up.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelect(n)}
                className={`flex w-full gap-2.5 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-concrete/60 ${
                  n.read ? '' : 'bg-amber/5'
                }`}
              >
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[n.type] || 'bg-slate'} ${n.read ? 'opacity-30' : ''}`} />
                <span className="min-w-0">
                  <span className={`block text-sm ${n.read ? 'font-medium text-ink' : 'font-semibold text-ink'}`}>
                    {n.title}
                  </span>
                  {n.body && <span className="block truncate text-xs text-slate">{n.body}</span>}
                  <span className="mt-0.5 block font-mono text-[10px] text-slate/70">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
