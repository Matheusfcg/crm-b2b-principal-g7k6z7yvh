import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Save,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  LogOut,
  CheckCircle,
  Link2,
  Phone,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

interface SafeInstance {
  id: string
  user_id: string
  provider: string
  instance_id: string
  status: string
  phone: string | null
  created_at: string | null
  updated_at: string | null
  has_instance_token: boolean
  has_client_token: boolean
  has_webhook_token: boolean
}

export function ZapiSettings() {
  const { user } = useAuth()
  const [instance, setInstance] = useState<SafeInstance | null>(null)
  const [config, setConfig] = useState({
    instance_id: '',
    instance_token: '',
    client_token: '',
    webhook_token: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('zapi-settings-open')
    return saved !== null ? saved === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem('zapi-settings-open', String(isOpen))
  }, [isOpen])

  const fetchInstance = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('zapi-get-config')
      if (error) throw error
      if (data?.instance) {
        setInstance(data.instance as SafeInstance)
        setConfig({
          instance_id: data.instance.instance_id || '',
          instance_token: '',
          client_token: '',
          webhook_token: '',
        })
      } else {
        setInstance(null)
      }
    } catch (err: any) {
      console.error('Error fetching config:', err)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchInstance()
  }, [fetchInstance])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('whatsapp_instances_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchInstance()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchInstance])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.functions.invoke('zapi-save-config', {
        body: {
          instance_id: config.instance_id,
          instance_token: config.instance_token || undefined,
          client_token: config.client_token || undefined,
          webhook_token: config.webhook_token || undefined,
        },
      })
      if (error) throw error
      toast.success('Configurações salvas com sucesso!')
      setConfig((p) => ({
        ...p,
        instance_token: '',
        client_token: '',
        webhook_token: '',
      }))
      await fetchInstance()
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-whatsapp-status')
      if (error) throw error
      if (data?.status === 'connected') toast.success('Conexão validada! Z-API está ativo.')
      else toast.error('Não foi possível conectar. Verifique as credenciais.')
      await fetchInstance()
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleGetQr = async () => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('connect-whatsapp-instance')
      if (error) throw error
      const qr = data?.qrcode || data?.qrCode
      setQrCode(qr)
      if (!qr) toast.error('QR Code não disponível. Verifique a configuração da instância.')
    } catch (err: any) {
      toast.error(`Erro ao obter QR Code: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('connect-whatsapp-instance')
      if (error) throw error
      const qr = data?.qrcode || data?.qrCode
      setQrCode(qr)
      toast.success('QR Code gerado. Escaneie para conectar.')
      await fetchInstance()
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    try {
      await supabase.functions.invoke('zapi-disconnect')
      toast.success('Instância desconectada.')
      setQrCode(null)
      await fetchInstance()
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const isConfigured = !!instance
  const isConnected = instance?.status === 'connected'
  const isConnecting = instance?.status === 'connecting'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <Card className="border-border shadow-sm bg-background">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader
          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-600" /> Provedor: Z-API
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 ml-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                    <span className="sr-only">Alternar painel</span>
                  </Button>
                </CollapsibleTrigger>
              </CardTitle>
              <CardDescription>
                Configure sua instância Z-API para conectar o WhatsApp.
              </CardDescription>
            </div>
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Wifi className="h-3 w-3 mr-1" /> Conectado
              </Badge>
            ) : isConnecting ? (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Conectando
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">
                <WifiOff className="h-3 w-3 mr-1" /> Desconectado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isConnected && instance?.phone && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  Número conectado: <strong>{instance.phone}</strong>
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Provedor</Label>
              <Input
                value="z-api"
                readOnly
                className="bg-muted font-mono text-sm text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Instance ID</Label>
                <Input
                  placeholder="Seu Instance ID"
                  value={config.instance_id}
                  onChange={(e) => setConfig((p) => ({ ...p, instance_id: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Instance Token
                  {instance?.has_instance_token && (
                    <span className="ml-2 text-xs text-green-600">✓ Configurado</span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    instance?.has_instance_token ? '•••••••• (digite para alterar)' : 'Seu Token'
                  }
                  value={config.instance_token}
                  onChange={(e) => setConfig((p) => ({ ...p, instance_token: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Client Token
                  {instance?.has_client_token && (
                    <span className="ml-2 text-xs text-green-600">✓ Configurado</span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    instance?.has_client_token
                      ? '•••••••• (digite para alterar)'
                      : 'Seu Client Token'
                  }
                  value={config.client_token}
                  onChange={(e) => setConfig((p) => ({ ...p, client_token: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Webhook Token
                  {instance?.has_webhook_token && (
                    <span className="ml-2 text-xs text-green-600">✓ Configurado</span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    instance?.has_webhook_token
                      ? '•••••••• (digite para alterar)'
                      : 'Token do Webhook (opcional)'
                  }
                  value={config.webhook_token}
                  onChange={(e) => setConfig((p) => ({ ...p, webhook_token: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg border border-border">
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <p className="font-mono text-xs text-foreground mt-1 break-all">
                https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/zapi-webhook
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSave}
                disabled={saving || !config.instance_id}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !isConfigured}
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Testar Conexão
              </Button>
            </div>

            {isConfigured && (
              <div className="pt-4 border-t border-slate-100">
                {isConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <Wifi className="h-5 w-5" />
                      <span className="font-medium">Status: Conectado</span>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnect}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    {qrCode ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white border-2 border-border rounded-xl shadow-sm">
                          <img src={qrCode} alt="QR Code" className="w-48 h-48 object-contain" />
                        </div>{' '}
                        <Button
                          variant="outline"
                          onClick={handleGetQr}
                          disabled={actionLoading}
                          className="gap-2"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Atualizar QR Code
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Conectar e Obter QR Code
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
