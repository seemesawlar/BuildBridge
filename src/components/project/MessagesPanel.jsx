import { useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function MessagesPanel({ projectId, userId, messages, onChange }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    await supabase.from('messages').insert({ project_id: projectId, sender_id: userId, body })
    setSending(false)
    setBody('')
    onChange()
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 font-display text-lg font-semibold text-blueprint">Messages</h3>

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate">No messages yet. Say hello.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-sm px-3 py-2 text-sm ${
            m.sender_id === userId ? 'ml-auto bg-blueprint text-chalk' : 'bg-line/40 text-ink'
          }`}>
            <p>{m.body}</p>
            <p className={`mt-1 font-mono text-[10px] ${m.sender_id === userId ? 'text-chalk/50' : 'text-slate'}`}>
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={sending} className="btn-primary px-3">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
