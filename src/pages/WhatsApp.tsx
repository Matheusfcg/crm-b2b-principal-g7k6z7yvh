import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Copy,
  Settings,
  AlertCircle,
  Phone,
  Check,
  QrCode,
  Loader2,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ZapiSettings } from '@/components/whatsapp/ZapiSettings'
import { ZapiChat } from '@/components/whatsapp/ZapiChat'

export default function WhatsApp() {
  const { user } = useAuth()
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')

  const fetchInstance = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.functions.invoke('zapi-get-config')
      if (error) throw error
      setInstance(data?.instance || null)
    } catch (err: any) {
      console.error('Error fetching config:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchInstance()
  }, [fetchInstance])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('whatsapp_instances_status_page')
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

  useEffect(() => {
    if (!user || !qrCode || instance?.status === 'connected') return
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-whatsapp-status')
        if (error) return
        if (data?.status === 'connected') {
          setQrCode(null)
          await fetchInstance()
          toast.success('WhatsApp conectado com sucesso!')
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [user, qrCode, instance?.status, fetchInstance])

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência!')
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#161a23]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e676]" />
      </div>
    )
  }

  return (
    <div className="dark h-full flex flex-col bg-[#161a23] text-slate-300 -m-4 sm:-m-6 p-4 sm:p-6 overflow-auto font-sans">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col max-w-[1200px] mx-auto"
      >
        <TabsList className="bg-transparent border-b border-slate-700/50 justify-start h-12 w-full rounded-none p-0 gap-8 mb-6 overflow-x-auto overflow-y-hidden">
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00e676] data-[state=active]:border-b-2 data-[state=active]:border-[#00e676] rounded-none h-full text-slate-400 font-medium text-sm px-0 pb-0 whitespace-nowrap"
          >
            Dados da instância web
          </TabsTrigger>
          <TabsTrigger
            value="webhooks"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00e676] data-[state=active]:border-b-2 data-[state=active]:border-[#00e676] rounded-none h-full text-slate-400 font-medium text-sm px-0 pb-0 whitespace-nowrap"
          >
            Webhooks e configurações gerais
          </TabsTrigger>
          <TabsTrigger
            value="pagamentos"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00e676] data-[state=active]:border-b-2 data-[state=active]:border-[#00e676] rounded-none h-full text-slate-400 font-medium text-sm px-0 pb-0 whitespace-nowrap"
          >
            Pagamentos
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00e676] data-[state=active]:border-b-2 data-[state=active]:border-[#00e676] rounded-none h-full text-slate-400 font-medium text-sm px-0 pb-0 whitespace-nowrap"
          >
            Chat & Teste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {!instance?.has_webhook_token && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Você ainda não configurou os webhooks nessa instância
                  <button
                    className="text-[#00e676] hover:underline ml-1 font-medium"
                    onClick={() => setActiveTab('webhooks')}
                  >
                    Configurar agora.
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">Meu número</h1>
                  <Settings
                    className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white transition-colors"
                    onClick={() => setActiveTab('webhooks')}
                  />
                </div>
                <p className="text-sm text-slate-500">
                  Criado em{' '}
                  {instance?.created_at
                    ? format(new Date(instance.created_at), 'dd/MM/yyyy')
                    : '...'}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 tracking-wider">CREDENCIAIS</h3>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">API da instância</label>
                  <div className="flex items-center gap-2 bg-[#1b1f27] border border-slate-700/50 rounded p-2.5">
                    <span className="flex-1 text-xs font-mono text-slate-300 truncate">
                      https://api.z-api.io/instances/{instance?.instance_id || 'ID_AQUI'}/token/
                      {instance?.has_instance_token ? '********' : 'TOKEN_AQUI'}/send-text
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `https://api.z-api.io/instances/${instance?.instance_id || 'ID_AQUI'}/token/${instance?.has_instance_token ? '********' : 'TOKEN_AQUI'}/send-text`,
                        )
                      }
                      className="hover:bg-slate-800 p-1 rounded transition-colors"
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4 text-slate-500 hover:text-white" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">ID da instância</label>
                    <div className="flex items-center gap-2 bg-[#1b1f27] border border-slate-700/50 rounded p-2.5">
                      <span className="flex-1 text-xs font-mono text-slate-300 truncate">
                        {instance?.instance_id || 'Não configurado'}
                      </span>
                      <button
                        onClick={() => copyToClipboard(instance?.instance_id || '')}
                        className="hover:bg-slate-800 p-1 rounded transition-colors"
                        title="Copiar ID"
                      >
                        <Copy className="w-4 h-4 text-slate-500 hover:text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-slate-400">Token da instância</label>
                      <button
                        className="text-[#00e676] hover:text-[#00c853] text-xs font-medium transition-colors"
                        onClick={() => setActiveTab('webhooks')}
                      >
                        Gerar novo token
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1b1f27] border border-slate-700/50 rounded p-2.5">
                      <span className="flex-1 text-xs font-mono text-slate-300 truncate">
                        {instance?.has_instance_token ? '****************' : 'Não configurado'}
                      </span>
                      <button
                        className="hover:bg-slate-800 p-1 rounded transition-colors cursor-not-allowed opacity-50"
                        title="Token oculto por segurança"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-orange-500/30 overflow-hidden mt-8 bg-transparent">
                <div className="p-4 border-b border-orange-500/30 flex items-center gap-3">
                  <span className="font-semibold text-white">Assinatura</span>
                  <span className="bg-[#4a2511] text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> TRIAL
                  </span>
                </div>
                <div className="p-4 text-sm text-slate-400">
                  Expira em <span className="font-semibold text-white ml-1">2d 10h 19m 37s</span>
                </div>
              </div>

              <Button className="mt-4 bg-[#00e676] hover:bg-[#00c853] text-[#161a23] font-bold px-8 h-10 rounded">
                Assinar
              </Button>
              <p className="text-xs text-slate-500 mt-3 max-w-xl leading-relaxed">
                Ao cancelar uma assinatura, a instância permanecerá ativa até o final do período já
                pago. Não haverá estorno do valor referente ao ciclo atual.
              </p>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-[#1b1f27] border border-slate-800 rounded-xl p-6 flex flex-col items-center text-center shadow-lg">
                <div className="flex items-center justify-between w-full mb-2">
                  <h2 className="text-xl font-bold text-white flex-1 text-center pl-6">
                    Leia o QRCode
                  </h2>
                  <Settings
                    className="w-5 h-5 text-slate-500 cursor-pointer hover:text-white"
                    onClick={() => setActiveTab('webhooks')}
                  />
                </div>
                <p className="text-[13px] text-slate-400 mb-8 leading-relaxed px-4">
                  Abra o aplicativo do whatsapp e leia o QRCode abaixo para se conectar a esta
                  instância
                </p>

                <div className="bg-white p-3 rounded-2xl w-[260px] h-[260px] flex items-center justify-center mb-8 relative shadow-inner">
                  {instance?.status === 'connected' ? (
                    <div className="text-green-600 font-bold flex flex-col items-center">
                      <Check className="w-16 h-16 mb-3 text-green-500" />
                      <span className="text-lg">Conectado</span>
                    </div>
                  ) : qrCode ? (
                    <div className="relative w-full h-full">
                      <img
                        src={qrCode}
                        alt="QR Code WhatsApp"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 m-auto w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center border border-slate-100">
                        <MessageCircle className="w-8 h-8 text-[#25D366] fill-current" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 rounded-xl border border-dashed border-slate-200">
                      <QrCode className="w-16 h-16 opacity-20 mb-3" />
                      {actionLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#00e676]" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleConnect}
                          className="text-[#00e676] hover:text-[#00c853] hover:bg-green-50"
                        >
                          Gerar QR Code
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  className="w-full bg-[#2a2f3a] text-slate-300 hover:bg-[#323844] hover:text-white border-none rounded-full h-11 text-sm font-medium mb-5"
                >
                  <Phone className="w-4 h-4 mr-2" /> Conectar com número de telefone
                </Button>

                <div className="w-full border border-orange-500/30 bg-[#2a1d17] rounded-xl p-4 flex items-start gap-3 text-left hover:bg-[#33221a] transition-colors cursor-pointer">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-orange-500 font-semibold text-[13px] mb-1">
                      Problemas com chave de acesso?
                    </h4>
                    <p className="text-orange-500/80 text-[12px] leading-tight">
                      <span className="underline mr-1">Clique aqui</span> e conecte via extensão da
                      Z-API, sem precisar de QR Code.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 mt-2" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="flex-1 outline-none">
          <div className="max-w-3xl">
            <ZapiSettings />
          </div>
        </TabsContent>

        <TabsContent value="pagamentos" className="flex-1 outline-none">
          <div className="bg-[#1b1f27] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <h3 className="text-lg font-medium text-white mb-2">Histórico de Pagamentos</h3>
            <p>Nenhuma fatura encontrada para esta assinatura.</p>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 outline-none h-[600px] flex flex-col">
          <ZapiChat />
        </TabsContent>
      </Tabs>
    </div>
  )
}
