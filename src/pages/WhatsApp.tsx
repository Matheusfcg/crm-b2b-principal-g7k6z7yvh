import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useMetaSdk } from '@/hooks/use-meta-sdk'
import { whatsappMetaService, WhatsappConfig } from '@/services/whatsapp-meta'
import { whatsappAccountsService, WhatsappAccount } from '@/services/whatsapp-accounts'
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat'
import { ConnectionWizard } from '@/components/whatsapp/ConnectionWizard'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function WhatsApp() {
  const { user } = useAuth()
  const { sdkReady, loading: sdkLoading, startEmbeddedSignup } = useMetaSdk()
  const [config, setConfig] = useState<WhatsappConfig | null>(null)
  const [account, setAccount] = useState<WhatsappAccount | null>(null)
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: acc } = await whatsappAccountsService.getAccount(user.id)
    setAccount(acc)
    const { data: cfg } = await whatsappMetaService.getConfig(user.id)
    setConfig(cfg)
    if (cfg || acc) {
      const { data: inst } = await whatsappMetaService.getInstance(user.id)
      if (inst) {
        setInstance(inst)
      } else {
        const phoneNumberId = acc?.phone_number_id || cfg?.phone_number_id
        if (phoneNumberId) {
          const { data: newInst } = await whatsappMetaService.ensureInstance(
            user.id,
            phoneNumberId,
            acc?.display_phone_number || undefined,
          )
          setInstance(newInst)
        }
      }
    } else {
      setInstance(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEmbeddedSignup = useCallback(() => {
    if (!user) return
    startEmbeddedSignup(user.id, async (code: string) => {
      setSaving(true)
      try {
        const { data, error } = await whatsappAccountsService.exchangeCode(code)
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        toast.success(
          `WhatsApp conectado!${data?.phone_number ? ` Número: ${data.phone_number}` : ''}`,
        )
        await fetchData()
      } catch (err: any) {
        toast.error(err.message || 'Erro ao conectar WhatsApp.')
      } finally {
        setSaving(false)
      }
    })
  }, [user, startEmbeddedSignup, fetchData])

  const handleSaveConfig = async (data: {
    phone_number_id: string
    waba_id: string
    access_token: string
  }) => {
    if (!user) return
    setSaving(true)
    try {
      const { data: saved, error } = await whatsappMetaService.saveConfig({
        user_id: user.id,
        ...data,
      })
      if (error) throw error
      const { data: inst } = await whatsappMetaService.ensureInstance(user.id, data.phone_number_id)
      setConfig(saved)
      setInstance(inst)
      setWizardOpen(false)
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
      if (account) {
        await whatsappAccountsService.deleteAccount(user.id)
      }
      await whatsappMetaService.deleteConfig(user.id)
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'disconnected' })
        .eq('id', instance.id)
      setConfig(null)
      setAccount(null)
      setInstance(null)
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
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp</h1>
          <p className="text-slate-500 text-sm">
            Gerencie suas conversas e integrações com WhatsApp Business.
          </p>
        </div>
      </div>
      <WhatsAppChat
        instance={instance}
        onAddNumber={handleEmbeddedSignup}
        addingNumber={saving || sdkLoading || !sdkReady}
        onOpenConfig={() => setWizardOpen(true)}
        onDisconnect={handleDisconnect}
        hasConfig={!!config || !!account}
        sdkReady={sdkReady}
      />
      <ConnectionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialConfig={config}
        onSave={handleSaveConfig}
        saving={saving}
      />
    </div>
  )
}
