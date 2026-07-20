import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  const refreshProfile = async (userId) => {
    // Don't rely on the `session` from closure/state here — right after
    // sign up, this can be called before this component's own session
    // state has updated, which would make it silently no-op. Ask
    // Supabase directly for the current user instead.
    const id = userId ?? session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id
    if (!id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    setProfile(data)
    return data
  }

  const signOut = () => supabase.auth.signOut()

  const value = { session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
