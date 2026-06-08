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
  const [isPolling, setIsPolling] = useState(false)

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }

  const fetchInstance = async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('id, user_id, status, qrcode, last_connection, phone')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setInstance(data)
        if (data.status === 'connecting') {
          setIsPolling(true)
        }
      } else {
        setInstance(null)
      }
    } catch (e) {
      console.error('Error fetching instance:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstance()
  }, [user])

  const checkStatus = async () => {
    if (!instance) return
    try {
      addLog(`GET STATUS via Edge Function`)
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'get_status', instanceName: instance.instance_name },
      })
      if (error) {
        console.error('Failed to check status:', error)
        addLog(`Erro ao verificar status: ${error.message}`)
      } else {
        if (data?.error) {
          addLog(`Resposta API erro (status): ${data.error}`)
          if (data?.code === 'INSTANCE_NOT_FOUND') {
            setInstance((prev: any) => ({ ...prev, status: 'not_found' }))
          }
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (instance?.status === 'connecting' && isPolling) {
      interval = setInterval(() => {
        checkStatus()
      }, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [instance?.status, isPolling])

  const handleCheckOrCreate = async () => {
    setActionLoading(true)
    addLog(`CHECK OR CREATE INSTANCE...`)
    try {
      const instanceName = instance?.instance_name || `user_${user?.id}`
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'check_or_create', instanceName },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) {
        const detailsStr =
          typeof data.details === 'object' ? JSON.stringify(data.details) : data.details
        const errorMessage = data.error || 'Erro desconhecido ao criar instância'
        throw new Error(detailsStr ? `${errorMessage} - Detalhes: ${detailsStr}` : errorMessage)
      }

      addLog('Instância inicializada com sucesso.')
      toast.success('Instância criada com sucesso. Gerando QR Code...')

      if (data?.instance) {
        setInstance(data.instance)
        setIsPolling(true)
      }
    } catch (error: any) {
      addLog(`Erro ao inicializar: ${error.message}`)
      toast.error(`Erro ao inicializar: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    addLog('Iniciando desconexão...')
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'delete', instanceName: instance?.instance_name },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
      if (data?.error) throw new Error(data.error)
      addLog('Instância desconectada e deletada com sucesso.')
      toast.success('WhatsApp desconectado.')
      setInstance(null)
      setIsPolling(false)
    } catch (error: any) {
      addLog(`Erro ao desconectar: ${error.message}`)
      toast.error(`Erro ao desconectar: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const isInitializing = loading

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

      {isInitializing ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <h2 className="text-xl font-medium text-slate-700 animate-pulse">
            Carregando Instância...
          </h2>
          <p className="text-sm text-slate-500">Verificando o ambiente de conexão.</p>
        </div>
      ) : (
        <ConnectionStatus
          instance={instance}
          actionLoading={actionLoading}
          onConnect={handleCheckOrCreate}
          onDisconnect={handleDisconnect}
        />
      )}

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
