import { useEffect, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ConnectionStatus } from '@/components/whatsapp/ConnectionStatus'
import { ChatInterface } from '@/components/whatsapp/ChatInterface'

export default function WhatsApp() {
  const { user } = useAuth()

  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInstance = async () => {
    if (!user) return
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) setInstance(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchInstance()

    if (!user) return

    const channel = supabase
      .channel('whatsapp_instances_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setInstance(payload.new)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const checkStatus = async () => {
    if (!instance || instance.status !== 'open') return
    try {
      await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'get-status' },
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (instance?.status === 'connecting') {
      interval = setInterval(() => {
        fetchInstance()
      }, 5000)
    } else if (instance?.status === 'open') {
      checkStatus()
      interval = setInterval(() => {
        checkStatus()
      }, 30000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [instance?.status, user])

  useEffect(() => {
    if (instance?.status === 'open' && !instance?.synced) {
      supabase.functions
        .invoke('whatsapp-manage', {
          body: { action: 'sync' },
        })
        .catch(console.error)
    }
  }, [instance?.status])

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'create-session' },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) {
        const detailsStr =
          typeof data.details === 'object' ? JSON.stringify(data.details) : data.details
        throw new Error(detailsStr ? `${data.error} - Detalhes: ${detailsStr}` : data.error)
      }
      toast.success('Instância solicitada. Aguarde o QR Code.')
      await fetchInstance()
    } catch (error: any) {
      toast.error(`Erro ao conectar: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'logout' },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) throw new Error(data.error)
      toast.success('WhatsApp desconectado.')
      await fetchInstance()
    } catch (error: any) {
      toast.error(`Erro ao desconectar: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex justify-center mt-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const isConnected = instance?.status === 'open'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Integration</h1>
          <p className="text-slate-500 text-sm">
            Sincronize mensagens e converse com seus leads diretamente pelo CRM.
          </p>
        </div>
      </div>

      {isConnected ? (
        <ChatInterface instance={instance} onDisconnect={handleDisconnect} />
      ) : (
        <ConnectionStatus
          instance={instance}
          actionLoading={actionLoading}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  )
}
