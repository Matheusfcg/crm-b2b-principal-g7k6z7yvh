import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ConnectionStatus } from '@/components/whatsapp/ConnectionStatus'
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat'

export default function WhatsApp() {
  const { user } = useAuth()

  const [instance, setInstance] = useState<any>(null)
  const [uazapiUrl, setUazapiUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [connectError, setConnectError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const hasInitialized = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }, [])

  const checkStatusWithTimeout = useCallback(
    async (inst: any) => {
      if (!inst || !inst.instance_name) return

      setActionLoading(true)
      setConnectError(null)
      setCountdown(5)

      const timer = setInterval(() => {
        setCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0))
      }, 1000)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'))
        }, 5000)
      })

      try {
        addLog(`CONNECT (Handshake & Webhook) via Edge Function`)
        const apiCall = supabase.functions.invoke('whatsapp-uazapi', {
          body: { action: 'connect', instanceName: inst.instance_name },
        })

        const res = (await Promise.race([apiCall, timeoutPromise])) as any
        const { data, error } = res

        if (error) throw error

        if (data?.error || data?.code === 'UNAUTHORIZED' || data?.code === 'SERVER_UNREACHABLE') {
          const errorMsg =
            data?.code === 'UNAUTHORIZED'
              ? 'Erro de Autenticação: Verifique com o administrador.'
              : data?.code === 'SERVER_UNREACHABLE'
                ? 'Erro de Conexão: Não foi possível alcançar o servidor da Uazapi.'
                : data.error
          setConnectError(errorMsg)
          if (data?.code === 'UNAUTHORIZED') {
            setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
          }
        } else {
          if (data?.uazapiUrl) {
            setUazapiUrl(data.uazapiUrl)
          }
          if (data?.instance) {
            if (
              data.instance.qrcode &&
              (typeof data.instance.qrcode !== 'string' || data.instance.qrcode.length < 10)
            ) {
              data.instance.qrcode = null
            }
            setInstance(data.instance)
            if (data.instance.status === 'open' || data.instance.status === 'connected') {
              toast.success('WhatsApp Conectado.')
            } else if (data.instance.status === 'qrcode' || data.instance.qrcode) {
              toast.info('QR Code aguardando leitura.')
            } else {
              setConnectError('Status desconhecido ou falha na conexão.')
              setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
            }
          }
        }
      } catch (e: any) {
        console.error(e)
        if (e.message === 'TIMEOUT') {
          setConnectError('Tempo limite atingido aguardando conexão. Tente novamente.')
          setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
        } else {
          setConnectError(`Erro de comunicação: ${e.message}`)
        }
      } finally {
        clearInterval(timer)
        setCountdown(null)
        setActionLoading(false)
      }
    },
    [addLog],
  )

  const handleReconnect = useCallback(() => {
    if (instance) {
      checkStatusWithTimeout(instance)
    }
  }, [instance, checkStatusWithTimeout])

  const fetchInstance = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select(
          'id, user_id, status, qrcode, last_connection, phone, instance_name, instance_token, server_url',
        )
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        if (data.qrcode && (typeof data.qrcode !== 'string' || data.qrcode.length < 10)) {
          data.qrcode = null
        }
        setInstance(data)

        if (data.instance_name) {
          if (data.status !== 'open' && data.status !== 'connected') {
            checkStatusWithTimeout(data)
          }
        }
      } else {
        setInstance(null)
      }
    } catch (e) {
      console.error('Error fetching instance:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      fetchInstance()
    }

    if (user) {
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
              setInstance((prev: any) => ({ ...prev, ...payload.new }))
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchInstance, user])

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
    } catch (error: any) {
      addLog(`Erro ao desconectar: ${error.message}`)
      toast.error(`Erro ao desconectar: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const isInitializing = loading && !instance
  const isConnected = instance?.status === 'open' || instance?.status === 'connected'
  const isQRCodeAvailable = Boolean(
    instance?.qrcode && typeof instance.qrcode === 'string' && instance.qrcode.length > 10,
  )

  useEffect(() => {
    if (isQRCodeAvailable) {
      console.log('Render Trigger: React state updated with new QR data, isQRCodeAvailable is true')
    }
  }, [isQRCodeAvailable])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Integration</h1>
          <p className="text-slate-500 text-sm">
            Vincule seu WhatsApp para sincronizar suas conversas no CRM.
          </p>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-3 space-y-4">
              <ConnectionStatus
                instance={instance}
                uazapiUrl={uazapiUrl}
                actionLoading={actionLoading}
                onConnect={() => handleReconnect()}
                onReconnect={handleReconnect}
                onDisconnect={handleDisconnect}
                error={connectError}
                countdown={countdown}
              />
              {isConnected && instance?.id && (
                <div className="mt-6 space-y-6">
                  <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Conectado como {instance.phone || instance.instance_name}
                      </h3>
                      <p className="text-sm text-slate-500">Sincronizado e pronto para uso.</p>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      disabled={actionLoading}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-4 py-2 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? 'Desconectando...' : 'Desconectar'}
                    </button>
                  </div>
                  <WhatsAppChat instanceId={instance.id} />
                </div>
              )}
            </div>
          </div>
        </div>
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
