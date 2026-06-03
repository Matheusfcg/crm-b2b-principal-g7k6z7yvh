import { useEffect, useState, useRef } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ConnectionStatus } from '@/components/whatsapp/ConnectionStatus'

export default function WhatsApp() {
  const { user } = useAuth()

  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const autoCreated = useRef(false)

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }

  const fetchInstance = async () => {
    if (!user) return
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setInstance(data)
    } else {
      if (!autoCreated.current) {
        autoCreated.current = true
        handleConnect(true)
      }
    }
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
    if (!instance) return
    try {
      addLog(`CHECK STATUS: ${instance.instance_name}`)
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'status' },
      })
      if (error) {
        console.error('Failed to check status:', error)
        addLog(`Erro ao verificar status: ${error.message}`)
      } else {
        if (data?.error) {
          addLog(`Resposta API erro (status): ${data.error}`)
        } else {
          addLog(`Status atualizado: ${data?.instance?.status}`)
        }
        if (data?.instance) {
          setInstance(data.instance)
        }
      }
    } catch (e: any) {
      console.error(e)
      addLog(`Exceção (status): ${e.message}`)
    }
  }

  const checkConnect = async () => {
    if (!instance) return
    try {
      addLog(`GET QRCODE: ${instance.instance_name}`)
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'connect' },
      })
      if (error) {
        console.error('Failed to check connect:', error)
        addLog(`Erro ao verificar connect: ${error.message}`)
      } else {
        if (data?.error) {
          addLog(`Resposta API erro (connect): ${data.error}`)
        } else {
          addLog(`Conexão atualizada: ${data?.instance?.status}`)
        }
        if (data?.instance) {
          setInstance(data.instance)
        }
      }
    } catch (e: any) {
      console.error(e)
      addLog(`Exceção (connect): ${e.message}`)
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (instance?.status === 'connecting') {
      interval = setInterval(() => {
        checkStatus()
        checkConnect()
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

  const handleConnect = async (isAuto = false) => {
    setActionLoading(true)
    addLog(`CREATE INSTANCE: ${instance?.instance_name || 'nova instância'}`)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'create' },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) {
        const detailsStr =
          typeof data.details === 'object' ? JSON.stringify(data.details) : data.details
        throw new Error(detailsStr ? `${data.error} - Detalhes: ${detailsStr}` : data.error)
      }
      if (!isAuto) {
        addLog('Instância solicitada. Aguarde o QR Code.')
        toast.success('Instância solicitada. Aguarde o QR Code.')
      }
      await fetchInstance()
    } catch (error: any) {
      addLog(`Erro ao conectar: ${error.message}`)
      if (!isAuto) {
        toast.error(`Erro ao conectar: ${error.message}`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    addLog('Iniciando desconexão...')
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'delete' },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) throw new Error(data.error)
      addLog('Instância desconectada com sucesso.')
      toast.success('WhatsApp desconectado.')
      await fetchInstance()
    } catch (error: any) {
      addLog(`Erro ao desconectar: ${error.message}`)
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Integration</h1>
          <p className="text-slate-500 text-sm">Vincule seu WhatsApp para futuras automações.</p>
        </div>
      </div>

      <ConnectionStatus
        instance={instance}
        actionLoading={actionLoading}
        onConnect={() => handleConnect(false)}
        onDisconnect={handleDisconnect}
      />

      {logs.length > 0 && (
        <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-hidden">
          <h3 className="text-slate-100 font-bold mb-2">Logs de Depuração da API</h3>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="break-all">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
