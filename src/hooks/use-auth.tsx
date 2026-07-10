import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
  chat_wallpaper?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  signUp: (email: string, password: string, options?: any) => Promise<{ data?: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string, userEmail: string, userMetadata: any) => {
    try {
      let { data } = await supabase
        .from('users' as any)
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // Caso a conta no auth.users tenha sido recriada mas a tabela users tenha o email original,
      // faremos um fallback para recuperar a permissão e papel (role) corretos!
      if (!data && userEmail) {
        const { data: emailData } = await supabase
          .from('users' as any)
          .select('*')
          .eq('email', userEmail)
          .maybeSingle()

        if (emailData) {
          data = emailData
        }
      }

      if (data) {
        setProfile(data as UserProfile)
      } else {
        // Fallback: se o usuário for completamente novo ou a trigger não disparou, criamos na hora
        const name = userMetadata?.name || userEmail?.split('@')[0] || 'Usuário'
        const newProfile = { id: userId, email: userEmail, name, role: 'vendedor' }

        const { data: insertedData, error: insertError } = await supabase
          .from('users' as any)
          .insert([newProfile])
          .select()
          .maybeSingle()

        if (insertedData && !insertError) {
          setProfile(insertedData as UserProfile)
        } else {
          setProfile(newProfile as UserProfile)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || '', user.user_metadata)
    }
  }

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, options?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        ...options,
      },
    })
    return { data, error }
  }
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, session, signUp, signIn, signOut, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}
