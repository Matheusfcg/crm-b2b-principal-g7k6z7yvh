import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, Loader2, Settings, LogOut, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { whatsappMetaService, WhatsappConfig } from '@/services/whatsapp-meta'
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat'
import { supabase } from '@/lib/supabase/client'

export default function WhatsApp() {
  const { user } = useAuth()
  const [config, setConfig] = useState<WhatsappConfig | null>(null)
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ phone_number_id: '', waba_id: '', access_token: '' })

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) return
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    document.body.appendChild(script)

    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId: '2113443072550231',
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      })
    }
  }, [])

  const handleEmbeddedSignup = () => {
    if (!(window as any).FB) {
      toast.error('O Facebook SDK ainda não foi carregado. Tente novamente em instantes.')
      return
    }

    ;(window as any).FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken
          exchangeTokenAndSave(accessToken)
        } else {
          toast.error('Login com Meta cancelado ou permissões não concedidas.')
        }
      },
      {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        extras: {
          feature: 'whatsapp_embedded_signup',
        },
      },
    )
  }

  const exchangeTokenAndSave = async (accessToken: string) => {
    if (!user) return
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-meta', {
        body: { action: 'setup_embedded_signup', accessToken, userId: user.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('WhatsApp Business conectado com sucesso!')
      fetchData()
    } catch (err: any) {
      toast.error(`Falha ao configurar via Meta: ${err.message}`)
      setConfigOpen(true) // Fallback to manual
    } finally {
      setSaving(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: cfg } = await whatsappMetaService.getConfig(user.id)
    setConfig(cfg)
    if (cfg) {
      const { data: inst } = await whatsappMetaService.getInstance(user.id)
      if (inst) {
        setInstance(inst)
      } else {
        const { data: newInst } = await whatsappMetaService.ensureInstance(
          user.id,
          cfg.phone_number_id,
        )
        setInstance(newInst)
      }
      setFormData({
        phone_number_id: cfg.phone_number_id,
        waba_id: cfg.waba_id,
        access_token: cfg.access_token,
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!user) return
    if (!formData.phone_number_id || !formData.waba_id || !formData.access_token) {
      toast.error('Preencha todos os campos.')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await whatsappMetaService.saveConfig({
        user_id: user.id,
        phone_number_id: formData.phone_number_id,
        waba_id: formData.waba_id,
        access_token: formData.access_token,
      })
      if (error) throw error
      const { data: inst } = await whatsappMetaService.ensureInstance(
        user.id,
        formData.phone_number_id,
      )
      setConfig(data)
      setInstance(inst)
      setConfigOpen(false)
      toast.success('Configuração salva com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user || !instance) return
    setSaving(true)
    try {
      await whatsappMetaService.deleteConfig(user.id)
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'disconnected' })
        .eq('id', instance.id)
      setConfig(null)
      setInstance(null)
      setFormData({ phone_number_id: '', waba_id: '', access_token: '' })
      toast.success('Configuração removida.')
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Carregando...</p>
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
          <p className="text-slate-500 text-sm">
            Configure a Meta Cloud API para sincronizar suas conversas.
          </p>
        </div>
      </div>

      {config && instance ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <h3 className="font-semibold text-slate-900">Meta Cloud API Conectado</h3>
                <p className="text-sm text-slate-500">Phone Number ID: {config.phone_number_id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                <Settings className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={saving}>
                <LogOut className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            </div>
          </div>
          <WhatsAppChat instanceId={instance.id} />
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
          <div>
            <h3 className="text-blue-900 font-semibold text-lg">Conecte seu WhatsApp Business</h3>
            <p className="text-sm text-blue-700 mt-1 max-w-lg">
              Integre sua conta do WhatsApp rapidamente usando o login oficial da Meta, ou configure
              manualmente suas credenciais.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleEmbeddedSignup}
              disabled={saving}
              className="bg-[#1877F2] hover:bg-[#1864D9] text-white whitespace-nowrap"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4 mr-2 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              Conectar com WhatsApp
            </Button>
            <Button
              onClick={() => setConfigOpen(true)}
              variant="outline"
              disabled={saving}
              className="whitespace-nowrap"
            >
              Configuração Manual
            </Button>
          </div>
        </div>
      )}

      {configOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !saving && setConfigOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Configurar Meta Cloud API</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <Input
                  id="phone_number_id"
                  placeholder="106540000000000"
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData((p) => ({ ...p, phone_number_id: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
                <Input
                  id="waba_id"
                  placeholder="100000000000000"
                  value={formData.waba_id}
                  onChange={(e) => setFormData((p) => ({ ...p, waba_id: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="access_token">Access Token</Label>
                <Input
                  id="access_token"
                  placeholder="EAA..."
                  value={formData.access_token}
                  onChange={(e) => setFormData((p) => ({ ...p, access_token: e.target.value }))}
                />
              </div>
              <div className="p-4 bg-slate-50 border rounded-md">
                <Label>Webhook URL</Label>
                <Input
                  readOnly
                  value="https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-meta"
                  className="bg-white mt-1 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Configure esta URL no Meta App Dashboard. Verify Token e App Secret são
                  gerenciados via Supabase Secrets (META_VERIFY_TOKEN, META_APP_SECRET).
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfigOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
