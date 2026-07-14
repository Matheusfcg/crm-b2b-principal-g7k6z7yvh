import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { whatsappMetaService, type WhatsappConfig } from '@/services/whatsapp-meta'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  config: WhatsappConfig | null
  onConfigChange: () => void
}

export function ManualConfigSection({ config, onConfigChange }: Props) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    phone_number_id: '',
    waba_id: '',
    access_token: '',
  })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; info?: string } | null>(null)

  const resetForm = useCallback(() => {
    setFormData({ phone_number_id: '', waba_id: '', access_token: '' })
    setTested(false)
    setTestResult(null)
    setShowToken(false)
  }, [])

  useEffect(() => {
    if (config) {
      setFormData({
        phone_number_id: config.phone_number_id || '',
        waba_id: config.waba_id || '',
        access_token: config.access_token || '',
      })
      setTested(true)
      setTestResult({ valid: true })
    } else {
      resetForm()
    }
  }, [config, resetForm])

  const handleTest = async () => {
    if (!formData.phone_number_id || !formData.access_token) return
    setTesting(true)
    setTestResult(null)
    try {
      const { data, error } = await whatsappMetaService.testConnection(
        formData.phone_number_id,
        formData.access_token,
      )
      if (error) throw error
      if (data?.valid) {
        setTested(true)
        setTestResult({ valid: true, info: data.data?.display_phone_number })
        toast.success('Conexão validada com sucesso!')
      } else {
        setTestResult({ valid: false })
        toast.error(data?.error || 'Falha na validação das credenciais.')
      }
    } catch (err: any) {
      setTestResult({ valid: false })
      toast.error(`Erro ao testar: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (!formData.phone_number_id || !formData.waba_id || !formData.access_token) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const { data: saved, error } = await whatsappMetaService.saveConfig({
        user_id: user.id,
        phone_number_id: formData.phone_number_id,
        waba_id: formData.waba_id,
        access_token: formData.access_token,
      })
      if (error) throw error
      await whatsappMetaService.ensureInstance(user.id, formData.phone_number_id)
      toast.success('Configurações salvas com sucesso!')
      onConfigChange()
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!user) return
    setRemoving(true)
    try {
      await whatsappMetaService.deleteConfig(user.id)
      const { data: inst } = await whatsappMetaService.getInstance(user.id)
      if (inst) {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'disconnected' })
          .eq('id', inst.id)
      }
      toast.success('Conexão removida com sucesso.')
      resetForm()
      onConfigChange()
    } catch (err: any) {
      toast.error(`Erro ao remover: ${err.message}`)
    } finally {
      setRemoving(false)
    }
  }

  const maskValue = (value: string) => {
    if (!value) return ''
    if (value.length <= 4) return '••••'
    return `${value.slice(0, 2)}${'•'.repeat(Math.min(value.length - 4, 16))}${value.slice(-2)}`
  }

  const isConfigured = !!config
  const fieldsChanged = !tested

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                Configuração Manual da API do WhatsApp
              </CardTitle>
              <CardDescription className="mt-1">
                Insira suas credenciais da Meta Cloud API para conectar sua conta comercial.
              </CardDescription>
            </div>
            {isConfigured ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Status: Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 border-slate-300">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Status: Não Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-slate-700">
              Bem-vindo ao seu painel de integração WhatsApp! Este projeto foi desenvolvido para
              centralizar o atendimento da sua empresa, permitindo gerenciar leads, tarefas e
              propostas diretamente integrados às suas conversas. Para que o sistema possa enviar e
              receber mensagens, você precisa conectar sua conta comercial da Meta.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              Guia de Configuração — Passo a Passo
            </h3>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>
                  Acesse o portal{' '}
                  <a
                    href="https://developers.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Meta for Developers <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  e faça login com sua conta.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span>
                  Selecione o seu Aplicativo e vá em <strong>WhatsApp &gt; Configuração</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span>
                  No menu <strong>Início</strong>, copie o <strong>ID do número de telefone</strong>{' '}
                  e o <strong>ID da conta do WhatsApp Business</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <span>
                  Gere um <strong>Token de Acesso Permanente</strong> no painel de Configurações do
                  Negócio (Business Settings &gt; System Users &gt; Generate Token, com escopo{' '}
                  <code className="text-xs bg-slate-200 px-1 rounded">
                    whatsapp_business_messaging
                  </code>
                  ).
                </span>
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-access-token" className="text-sm font-medium">
                Token de Acesso
              </Label>
              <div className="relative">
                <Input
                  id="manual-access-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="EAA..."
                  value={isConfigured ? maskValue(formData.access_token) : formData.access_token}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, access_token: e.target.value }))
                    setTested(false)
                  }}
                  disabled={isConfigured}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Token de acesso permanente do System User. Tratado como dado sensível.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-phone-id" className="text-sm font-medium">
                  ID do Número de Telefone
                </Label>
                <Input
                  id="manual-phone-id"
                  placeholder="106540000000000"
                  value={
                    isConfigured ? maskValue(formData.phone_number_id) : formData.phone_number_id
                  }
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, phone_number_id: e.target.value }))
                    setTested(false)
                  }}
                  disabled={isConfigured}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-waba-id" className="text-sm font-medium">
                  ID da Conta WABA
                </Label>
                <Input
                  id="manual-waba-id"
                  placeholder="100000000000000"
                  value={isConfigured ? maskValue(formData.waba_id) : formData.waba_id}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, waba_id: e.target.value }))
                    setTested(false)
                  }}
                  disabled={isConfigured}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {testResult?.valid && !isConfigured && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> Conexão válida!
                {testResult.info && ` Número: ${testResult.info}`}
              </AlertDescription>
            </Alert>
          )}
          {testResult && !testResult.valid && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">
                Falha na validação. Verifique o ID do Número de Telefone e o Token de Acesso.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!isConfigured ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !formData.phone_number_id || !formData.access_token}
                  className="gap-2"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !formData.phone_number_id ||
                    !formData.waba_id ||
                    !formData.access_token
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={removing}
                className="gap-2"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {removing ? 'Removendo...' : 'Remover Conexão'}
              </Button>
            )}
          </div>

          {isConfigured && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Conta Conectada</span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p>
                  <strong>ID do Número:</strong>{' '}
                  <span className="font-mono">{maskValue(formData.phone_number_id)}</span>
                </p>
                <p>
                  <strong>ID da Conta WABA:</strong>{' '}
                  <span className="font-mono">{maskValue(formData.waba_id)}</span>
                </p>
                <p>
                  <strong>Token:</strong>{' '}
                  <span className="font-mono">{maskValue(formData.access_token)}</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
