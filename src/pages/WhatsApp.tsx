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
  const [qrCountdown, setQrCountdown] = useState<number | null>(null)

  const [configOpen, setConfigOpen] = useState(false)
  const [configData, setConfigData] = useState({
    instance_name: '',
    server_url: 'https://api.uazapi.com',
    instance_token: '',
  })
  const [savingConfig, setSavingConfig] = useState(false)

  const hasInitialized = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }, [])

  const checkStatusWithTimeout = useCallback(
    async (inst: any, action: 'connect' | 'force_sync' = 'connect') => {
      if (!inst || !inst.instance_name) return

      setActionLoading(true)
      setConnectError(null)
      setCountdown(180)

      const timer = setInterval(() => {
        setCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0))
      }, 1000)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'))
        }, 180000)
      })

      try {
        addLog(`${action.toUpperCase()} (Handshake & Webhook) via Edge Function`)

        if (!navigator.onLine) {
          throw new Error('Sem conexão com a internet. Verifique sua rede.')
        }

        const apiCall = supabase.functions.invoke('whatsapp-uazapi', {
          body: { action, instanceId: inst.id, instanceName: inst.instance_name },
        })

        const res = (await Promise.race([apiCall, timeoutPromise])) as any
        const { data, error } = res

        if (error) {
          console.error('[WhatsApp] Edge Function Error:', error)

          if (
            error.name === 'FunctionsFetchError' ||
            error?.message?.includes('Failed to send a request') ||
            error?.message?.includes('fetch failed')
          ) {
            throw new Error(
              `Falha ao conectar com a Edge Function (Network/CORS). Detalhe: ${error.message}`,
            )
          }
          throw new Error(error.message || 'Erro desconhecido ao chamar a função.')
        }

        if (
          data?.error ||
          data?.code === 'UNAUTHORIZED' ||
          data?.code === 'SERVER_UNREACHABLE' ||
          data?.code === 'TIMEOUT' ||
          data?.code === 'INSTANCE_NOT_FOUND' ||
          data?.code === 'RATE_LIMIT_REACHED' ||
          data?.code === 'UAZAPI_TOKEN_MISSING'
        ) {
          let errorMsg = data.error || 'Erro desconhecido.'
          if (data?.code === 'UNAUTHORIZED') {
            errorMsg = 'Erro de Autenticação: Verifique com o administrador.'
          } else if (data?.code === 'SERVER_UNREACHABLE') {
            errorMsg = 'Erro de Conexão: Não foi possível alcançar o servidor da Uazapi.'
          } else if (data?.code === 'TIMEOUT') {
            errorMsg = 'Ocorreu um tempo limite na conexão. A API da Uazapi não respondeu a tempo.'
          } else if (data?.code === 'INSTANCE_NOT_FOUND') {
            errorMsg = `Instância não encontrada (404): ${data.details?.error || data.error}`
          } else if (data?.code === 'RATE_LIMIT_REACHED') {
            errorMsg =
              'Limite de instâncias atingido na Uazapi. Por favor, remova instâncias inativas no painel da Uazapi para continuar.'
          } else if (data?.code === 'UAZAPI_TOKEN_MISSING') {
            errorMsg =
              'Token Uazapi não configurado. Por favor, atualize a configuração da instância.'
          }

          setConnectError(errorMsg)
          toast.error(errorMsg)
          if (data?.code === 'UNAUTHORIZED') {
            setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
          }
          if (data?.code === 'TIMEOUT') {
            setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
          }
          if (data?.code === 'INSTANCE_NOT_FOUND') {
            setInstance((prev: any) => (prev ? { ...prev, status: 'not_found' } : prev))
          }
          if (data?.code === 'RATE_LIMIT_REACHED') {
            setInstance((prev: any) => (prev ? { ...prev, status: 'rate_limited' } : prev))
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
              setQrCountdown(null)
            } else if (
              data.instance.status === 'qrcode' ||
              data.instance.qrcode ||
              data.instance.status === 'connecting'
            ) {
              toast.info('QR Code aguardando leitura.')
              setQrCountdown(180)
            } else {
              setConnectError('Status desconhecido ou falha na conexão.')
              setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
              setQrCountdown(null)
            }
          }
        }
      } catch (e: any) {
        console.error('[WhatsApp] Exception in checkStatusWithTimeout:', e)
        if (e.message === 'TIMEOUT') {
          const msg = 'Ocorreu um tempo limite na conexão. A API da Uazapi não respondeu a tempo.'
          setConnectError(msg)
          toast.error(msg)
          setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
        } else if (
          e.message?.includes('Limite de instâncias atingido') ||
          e.message?.includes('Maximum number of instances connected reached')
        ) {
          const msg =
            'Limite de instâncias atingido na Uazapi. Por favor, remova instâncias inativas no painel da Uazapi para continuar.'
          setConnectError(msg)
          toast.error(msg)
          setInstance((prev: any) => (prev ? { ...prev, status: 'rate_limited' } : prev))
        } else if (
          e.name === 'FunctionsFetchError' ||
          e?.message?.includes('Failed to send a request') ||
          e?.message?.includes('fetch failed') ||
          e?.message?.includes('Falha ao conectar com a Edge Function')
        ) {
          const msg =
            e.message ||
            'Falha ao conectar com a Edge Function. Verifique sua conexão ou tente novamente.'
          setConnectError(msg)
          toast.error(msg)
        } else {
          const msg = `Erro de comunicação: ${e.message || 'Desconhecido'}`
          setConnectError(msg)
          toast.error(msg)
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
      setConnectError(null)
      checkStatusWithTimeout(instance, 'connect')
    }
  }, [instance, checkStatusWithTimeout])

  const handleForceSync = useCallback(() => {
    if (instance) {
      setConnectError(null)
      checkStatusWithTimeout(instance, 'force_sync')
    }
  }, [instance, checkStatusWithTimeout])

  const fetchInstance = useCallback(async () => {
    if (!user) return
    setLoading(true)

    if (!navigator.onLine) {
      toast.error('Sem conexão com a internet. Verifique sua rede.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select(
          'id, user_id, status, qrcode, last_connection, phone, instance_name, instance_token, server_url',
        )
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[WhatsApp] Error fetching instance:', error)
        toast.error('Falha ao conectar com o banco de dados. Tentando novamente em breve.')
        return
      }

      if (data) {
        if (data.qrcode && (typeof data.qrcode !== 'string' || data.qrcode.length < 10)) {
          data.qrcode = null
        }

        let initialCountdown = null
        if ((data.status === 'connecting' || data.status === 'qrcode') && data.qrcode) {
          const updatedAt = data.updated_at
            ? new Date(data.updated_at).getTime()
            : new Date().getTime()
          const now = new Date().getTime()
          const diffSeconds = Math.floor((now - updatedAt) / 1000)
          if (diffSeconds >= 0 && diffSeconds < 180) {
            initialCountdown = 180 - diffSeconds
          } else if (diffSeconds >= 180 && diffSeconds < 240) {
            // Allow a small grace period just in case the backend hasn't synced yet
            initialCountdown = 240 - diffSeconds
          } else {
            data.status = 'timeout'
            data.last_error = 'O tempo limite do QR Code expirou.'
            setConnectError('O QR Code anterior expirou. Gere um novo.')
          }
        }

        setInstance(data)
        if (initialCountdown) setQrCountdown(initialCountdown)

        setConfigData({
          instance_name: data.instance_name || '',
          server_url: data.server_url || 'https://api.uazapi.com',
          instance_token: data.instance_token || '',
        })
      } else {
        setInstance(null)
      }
    } catch (e) {
      console.error('[WhatsApp] Error in fetchInstance:', e)
      toast.error('Erro ao buscar dados da instância.')
    } finally {
      setLoading(false)
    }
  }, [user, checkStatusWithTimeout])

  const handleSaveConfig = async () => {
    if (!user) return
    if (!configData.instance_name || !configData.server_url || !configData.instance_token) {
      toast.error('Preencha todos os campos.')
      return
    }

    setSavingConfig(true)
    try {
      const payload = {
        ...(instance?.id ? { id: instance.id } : {}),
        user_id: user.id,
        instance_name: configData.instance_name,
        server_url: configData.server_url,
        instance_token: configData.instance_token,
        status: instance?.status || 'connecting',
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('whatsapp_instances')
        .upsert(payload, { onConflict: 'instance_name' })
        .select()
        .single()

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
      setConfigOpen(false)

      if (data) {
        setInstance(data)
        checkStatusWithTimeout(data, 'connect')
      } else {
        fetchInstance()
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.details || ''
      const errorCode = error?.code || ''
      if (
        errorCode === '23505' ||
        errorMsg.includes('whatsapp_instances_instance_name_key') ||
        errorMsg.includes('duplicate key value')
      ) {
        toast.error('Este nome de instância já está em uso. Por favor, escolha um nome diferente.')
      } else {
        toast.error(`Erro ao salvar configurações: ${error.message}`)
      }
    } finally {
      setSavingConfig(false)
    }
  }

  useEffect(() => {
    if (instance?.status === 'open' || instance?.status === 'connected') {
      setQrCountdown(null)
      setConnectError(null)
    } else if (
      instance?.status === 'unauthorized' ||
      instance?.status === 'not_found' ||
      instance?.status === 'rate_limited' ||
      instance?.status === 'timeout'
    ) {
      if (instance.last_error) {
        setConnectError(instance.last_error)
      }
    }
  }, [instance?.status, instance?.last_error])

  useEffect(() => {
    let timer: NodeJS.Timeout
    let syncTimer: NodeJS.Timeout

    if (qrCountdown !== null && qrCountdown > 0) {
      timer = setInterval(() => {
        setQrCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
      }, 1000)

      syncTimer = setInterval(() => {
        if (instance && (instance.status === 'connecting' || instance.status === 'qrcode')) {
          supabase.functions
            .invoke('whatsapp-uazapi', {
              body: {
                action: 'force_sync',
                instanceId: instance.id,
                instanceName: instance.instance_name,
              },
            })
            .then(({ data, error }) => {
              if (error) {
                console.error('[WhatsApp] Polling sync error:', error)
                return
              }
              if (
                data &&
                (data.state === 'open' || data.state === 'connected' || data.status === 'connected')
              ) {
                setQrCountdown(null)
                fetchInstance()
              }
            })
        }
      }, 10000)
    } else if (qrCountdown === 0) {
      if (instance?.status === 'connecting' || instance?.status === 'qrcode') {
        setInstance((prev: any) =>
          prev
            ? { ...prev, status: 'timeout', last_error: 'O tempo limite do QR Code expirou.' }
            : prev,
        )
        setConnectError(
          'O tempo limite para ler o QR Code expirou. Por favor, gere um novo código.',
        )

        if (instance?.id) {
          supabase
            .from('whatsapp_instances')
            .update({
              status: 'timeout',
              last_error: 'Timeout na leitura do QR Code',
              updated_at: new Date().toISOString(),
            })
            .eq('id', instance.id)
            .then()
        }
      }
      setQrCountdown(null)
    }

    return () => {
      clearInterval(timer)
      clearInterval(syncTimer)
    }
  }, [qrCountdown, instance?.id, instance?.status, instance?.instance_name, fetchInstance])

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
      if (!navigator.onLine) {
        throw new Error('Sem conexão com a internet.')
      }

      if (instance?.id) {
        const { error } = await supabase
          .from('whatsapp_instances')
          .update({
            status: 'disconnected',
            qrcode: null,
            phone: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', instance.id)
        if (error) throw error
      }

      addLog('Instância desconectada e deletada com sucesso.')
      toast.success('WhatsApp desconectado.')
      setInstance((prev: any) => (prev ? { ...prev, status: 'disconnected', qrcode: null } : null))
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
                onConnect={() => setConfigOpen(true)}
                onReconnect={handleReconnect}
                onDisconnect={handleDisconnect}
                onForceSync={handleForceSync}
                onConfig={() => setConfigOpen(true)}
                error={connectError}
                countdown={countdown}
                qrCountdown={qrCountdown}
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

      {configOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Configurar Instância</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="instance_name">Nome / ID da Instância</Label>
                <Input
                  id="instance_name"
                  placeholder="ex: rf082990e59c1b2"
                  value={configData.instance_name}
                  onChange={(e) =>
                    setConfigData((prev) => ({ ...prev, instance_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="server_url">Server URL</Label>
                <Input
                  id="server_url"
                  placeholder="https://api.uazapi.com ou https://seusubdominio.uazapi.com"
                  value={configData.server_url}
                  onChange={(e) =>
                    setConfigData((prev) => ({ ...prev, server_url: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="instance_token">Instance Token / API Key</Label>
                <Input
                  id="instance_token"
                  placeholder="Cole o token UUID da instancia Uazapi"
                  value={configData.instance_token}
                  onChange={(e) =>
                    setConfigData((prev) => ({ ...prev, instance_token: e.target.value }))
                  }
                />
              </div>
              <div className="mt-4 p-4 bg-slate-50 border rounded-md">
                <Label>Webhook URL (Global)</Label>
                <Input
                  readOnly
                  value="https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi"
                  className="bg-white mt-1 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Configure esta URL no painel da Uazapi (Global Webhook) para receber atualizações
                  em tempo real via Webhook e evitar bloqueios de requisições GET recorrentes.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfigOpen(false)}
                disabled={savingConfig}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingConfig ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
