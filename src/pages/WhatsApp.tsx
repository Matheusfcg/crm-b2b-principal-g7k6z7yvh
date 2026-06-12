import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircle, Loader2, Copy, Check, Settings2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
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
  const [isPolling, setIsPolling] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [configForm, setConfigForm] = useState({
    instance_name: '',
    server_url: 'https://apiwhatsvexaview.uazapi.com',
    instance_token: '',
  })

  const hasInitialized = useRef(false)
  const pollCountRef = useRef(0)

  const webhookUrl = 'https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi'

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('Webhook URL copiada!')
    setTimeout(() => setCopied(false), 2000)
  }

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }, [])

  const checkStatus = useCallback(
    async (inst: any) => {
      if (!inst) return
      try {
        addLog(`GET STATUS via Edge Function`)
        const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
          body: { action: 'get_status', instanceName: inst.instance_name },
        })

        console.log('Complete JSON response from whatsapp-uazapi:', data)
        console.log('Specific value of qrcode field:', data?.instance?.qrcode)
        if (data?.instance?.qrcode) {
          console.log('Length of base64 string received:', data.instance.qrcode.length)
        }
        console.log('isQRCodeAvailable:', !!data?.instance?.qrcode)

        if (error) {
          console.error('Failed to check status:', error)
          addLog(`Erro ao verificar status: ${error.message}`)
        } else {
          if (data?.error || data?.code === 'UNAUTHORIZED') {
            addLog(`Resposta API erro (status): ${data.error || 'UNAUTHORIZED'}`)
            if (data?.code === 'UNAUTHORIZED' || error?.message?.includes('401')) {
              setIsPolling(false)
              setConnectError(
                'Erro de Autenticação: Verifique se o Instance Token e a Server URL estão corretos no painel da Uazapi.',
              )
              setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
            } else if (data?.code === 'TOKEN_MISSING') {
              setIsPolling(false)
              setConnectError(
                'Token da instância não configurado. Por favor, desconecte e conecte novamente.',
              )
              setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
            } else if (data?.code === 'INSTANCE_NOT_FOUND') {
              pollCountRef.current += 1
              if (pollCountRef.current >= 5) {
                setInstance((prev: any) => (prev ? { ...prev, status: 'not_found' } : prev))
                setIsPolling(false)
                setConnectError('Instância não encontrada na API. Tente conectar novamente.')
              } else {
                addLog(
                  `Ignorando erro 'Instance not found' (tentativa ${pollCountRef.current} de 5).`,
                )
                setIsPolling(true)
              }
            } else {
              setIsPolling(false)
              setConnectError(`Erro na API: ${data.error}`)
            }
          } else {
            addLog(`Status atualizado: ${data?.instance?.status}`)
          }

          if (data?.uazapiUrl) {
            setUazapiUrl(data.uazapiUrl)
          }

          if (data?.instance) {
            // Ensure qrcode is null if it's not a valid string
            if (
              data.instance.qrcode &&
              (typeof data.instance.qrcode !== 'string' || data.instance.qrcode.length < 10)
            ) {
              data.instance.qrcode = null
            }
            if (data.is_connecting !== undefined) {
              data.instance.is_connecting = data.is_connecting
            }
            setInstance(data.instance)
            const hasQrCode = !!data.instance.qrcode

            if (data.instance.status === 'open' || data.instance.status === 'connected') {
              setIsPolling(false)
              pollCountRef.current = 0
            } else if (
              data.instance.status === 'connecting' ||
              data.instance.status === 'qrcode' ||
              hasQrCode
            ) {
              if (data.instance.status === 'qrcode' || hasQrCode) {
                // AC: Terminate the polling loop immediately upon receiving 'qrcode' status
                pollCountRef.current = 0
                setIsPolling(false)
              } else if (!hasQrCode && data.instance.status === 'connecting') {
                pollCountRef.current += 1
                if (pollCountRef.current >= 5) {
                  setIsPolling(false)
                  setInstance((prev: any) => (prev ? { ...prev, status: 'timeout' } : prev))
                  setConnectError('Tempo limite atingido aguardando QR Code. Tente novamente.')
                  return
                }
                setIsPolling(true)
              } else {
                pollCountRef.current = 0
                setIsPolling(false)
              }
            }
          }
        }
      } catch (e: any) {
        console.error(e)
        addLog(`Exceção (status): ${e.message}`)
        setIsPolling(false)
        if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
          setConnectError(
            'Erro de Autenticação: Verifique se o Instance Token e a Server URL estão corretos no painel da Uazapi.',
          )
          setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
        } else {
          setConnectError(`Erro de comunicação: ${e.message}`)
        }
      }
    },
    [addLog],
  )

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configForm.instance_name || !configForm.server_url || !configForm.instance_token) {
      toast.error('Preencha todos os campos.')
      return
    }
    setActionLoading(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .upsert(
          {
            user_id: user?.id,
            instance_name: configForm.instance_name,
            server_url: configForm.server_url,
            instance_token: configForm.instance_token,
            status: 'connecting',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single()

      if (error) throw error

      setInstance(data)
      toast.success('Configurações salvas.')

      const fnRes = await supabase.functions.invoke('whatsapp-uazapi', {
        body: { action: 'get_status', instanceName: configForm.instance_name },
      })

      if (fnRes.error) throw fnRes.error

      if (fnRes.data?.error || fnRes.data?.code === 'UNAUTHORIZED') {
        const errorMsg =
          fnRes.data?.code === 'UNAUTHORIZED'
            ? 'Erro de Autenticação: Verifique se o Instance Token e a Server URL estão corretos no painel da Uazapi.'
            : fnRes.data.error
        toast.error(errorMsg)
        setConnectError(errorMsg)
        setInstance((prev: any) => (prev ? { ...prev, status: 'unauthorized' } : prev))
      } else {
        toast.success('Instância verificada com sucesso.')
        if (fnRes.data?.instance) {
          setInstance(fnRes.data.instance)
          if (fnRes.data.instance.status === 'qrcode' || fnRes.data.instance.qrcode) {
            setIsPolling(false)
          } else if (fnRes.data.instance.status === 'connecting') {
            setIsPolling(true)
          } else if (
            fnRes.data.instance.status === 'open' ||
            fnRes.data.instance.status === 'connected'
          ) {
            setIsPolling(false)
          }
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar configuração')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOrCreate = useCallback(
    async (forcedInstanceName?: string) => {
      setActionLoading(true)
      setConnectError(null)
      pollCountRef.current = 0
      setIsPolling(false)
      addLog(`CHECK OR CREATE INSTANCE...`)
      try {
        const instanceName = forcedInstanceName || `user_${user?.id}`
        const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
          body: { action: 'check_or_create', instanceName },
        })

        console.log('Complete JSON response from whatsapp-uazapi:', data)
        console.log('Specific value of qrcode field:', data?.instance?.qrcode)
        if (data?.instance?.qrcode) {
          console.log('Length of base64 string received:', data.instance.qrcode.length)
        }
        console.log('isQRCodeAvailable:', !!data?.instance?.qrcode)

        let functionError = data?.error
        let errorCode = data?.code

        if (error) {
          try {
            if ((error as any).context?.error) {
              functionError = (error as any).context.error
              errorCode = (error as any).context.code || errorCode
            } else if ((error as any).message?.includes('401')) {
              errorCode = 'UNAUTHORIZED'
            }
          } catch {
            /* intentionally ignored */
          }
        }

        if (errorCode === 'UNAUTHORIZED') {
          throw new Error(
            'Erro de Autenticação: Verifique se o Instance Token e a Server URL estão corretos no painel da Uazapi.',
          )
        }

        if (errorCode === 'TOKEN_MISSING') {
          throw new Error(
            'Token da instância não configurado. Remova a instância atual e tente novamente.',
          )
        }

        if (
          functionError === 'LIMIT_REACHED' ||
          (error && error.message.includes('LIMIT_REACHED'))
        ) {
          throw new Error(
            'Limite de instâncias atingido no seu plano Uazapi. Por favor, remova uma instância antiga no painel da Uazapi.',
          )
        }

        if (error && !functionError) {
          throw new Error(error.message || 'Erro ao comunicar com a Edge Function')
        }

        if (functionError) {
          const detailsStr =
            typeof data?.details === 'object' ? JSON.stringify(data.details) : data?.details
          const errorMessage = functionError || 'Erro desconhecido ao criar instância'
          throw new Error(detailsStr ? `${errorMessage} - Detalhes: ${detailsStr}` : errorMessage)
        }

        addLog('Instância inicializada/recuperada.')

        if (data?.uazapiUrl) {
          setUazapiUrl(data.uazapiUrl)
        }

        if (
          !data?.instance?.qrcode &&
          (data?.instance?.status === 'connecting' ||
            data?.instance?.status === 'qrcode' ||
            data?.is_connecting)
        ) {
          toast.info('Instância verificada. Aguardando inicialização...')
        } else if (
          data?.instance?.qrcode &&
          data?.instance?.status !== 'connected' &&
          data?.instance?.status !== 'open'
        ) {
          toast.success('Instância conectada ao servidor. QR Code gerado.')
        }

        if (data?.instance) {
          if (
            data.instance.qrcode &&
            (typeof data.instance.qrcode !== 'string' || data.instance.qrcode.length < 10)
          ) {
            data.instance.qrcode = null
          }
          if (data.is_connecting !== undefined) {
            data.instance.is_connecting = data.is_connecting
          }
          setInstance(data.instance)
          const isConnectedInstance =
            data.instance.status === 'open' || data.instance.status === 'connected'
          const isQrCodeStatus = data.instance.status === 'qrcode'
          setIsPolling(!isConnectedInstance && !isQrCodeStatus && !data.instance.qrcode)
        }
      } catch (error: any) {
        addLog(`Erro ao inicializar: ${error.message}`)
        const errMsg = error.message.includes('Limite de instâncias atingido')
          ? error.message
          : `Erro ao inicializar: ${error.message}`
        toast.error(errMsg)
        setConnectError(errMsg)
      } finally {
        setActionLoading(false)
      }
    },
    [user, addLog],
  )

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
        setConfigForm({
          instance_name: data.instance_name || '',
          server_url: data.server_url || 'https://apiwhatsvexaview.uazapi.com',
          instance_token: data.instance_token || '',
        })
      } else {
        setInstance(null)
      }
    } catch (e) {
      console.error('Error fetching instance:', e)
    } finally {
      setLoading(false)
    }
  }, [user, handleCheckOrCreate])

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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const isConnecting = instance?.status === 'connecting' || instance?.status === 'qrcode'
    const hasQrCode = !!instance?.qrcode

    if (isConnecting && !hasQrCode && isPolling) {
      timeoutId = setTimeout(() => {
        checkStatus(instance)
      }, 3000)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [instance, isPolling, checkStatus])

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
          <p className="text-slate-500 text-sm">Vincule seu WhatsApp para futuras automações.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            Webhook URL{' '}
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
              Uazapi
            </span>
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure esta URL no painel da Uazapi para receber eventos no CRM.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <code className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded text-slate-600 truncate flex-1 md:w-[350px]">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhook}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors bg-white shadow-sm flex-shrink-0"
            title="Copiar URL"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
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
          {!isConnected && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1">
                <Card className="border-slate-200 shadow-sm sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-slate-500" />
                      Configuração Manual
                    </CardTitle>
                    <CardDescription>
                      Insira as credenciais da sua instância Uazapi.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveConfig}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="instance_name">Nome da Instância</Label>
                        <Input
                          id="instance_name"
                          value={configForm.instance_name}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, instance_name: e.target.value })
                          }
                          placeholder="Ex: VexaView"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server_url">Server URL</Label>
                        <Input
                          id="server_url"
                          value={configForm.server_url}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, server_url: e.target.value })
                          }
                          placeholder="https://apiwhatsvexaview.uazapi.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instance_token">Instance Token</Label>
                        <Input
                          id="instance_token"
                          value={configForm.instance_token}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, instance_token: e.target.value })
                          }
                          placeholder="Token da Instância"
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end p-4">
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar e Verificar
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </div>
              <div className="xl:col-span-2 space-y-4">
                <ConnectionStatus
                  instance={instance}
                  uazapiUrl={uazapiUrl}
                  actionLoading={actionLoading}
                  onConnect={() => handleCheckOrCreate()}
                  onDisconnect={handleDisconnect}
                  error={connectError}
                />
                {connectError && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={() => handleCheckOrCreate()}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {actionLoading ? 'Processando...' : 'Tentar Novamente'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isConnected && instance?.id && (
            <div className="space-y-6">
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
