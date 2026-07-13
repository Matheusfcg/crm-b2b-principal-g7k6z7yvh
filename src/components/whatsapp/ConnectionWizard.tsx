import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { whatsappMetaService, type WhatsappConfig } from '@/services/whatsapp-meta'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConfig: WhatsappConfig | null
  onSave: (data: {
    phone_number_id: string
    waba_id: string
    access_token: string
  }) => Promise<void>
  saving: boolean
}

const STEPS = ['Instruções', 'Credenciais', 'Confirmação']

export function ConnectionWizard({ open, onOpenChange, initialConfig, onSave, saving }: Props) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    phone_number_id: '',
    waba_id: '',
    access_token: '',
  })
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; info?: string } | null>(null)

  useEffect(() => {
    if (initialConfig && open) {
      setFormData({
        phone_number_id: initialConfig.phone_number_id,
        waba_id: initialConfig.waba_id,
        access_token: initialConfig.access_token,
      })
    } else if (!open) {
      setFormData({ phone_number_id: '', waba_id: '', access_token: '' })
      setStep(0)
      setTested(false)
      setTestResult(null)
    }
  }, [initialConfig, open])

  const handleTest = async () => {
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
    await onSave(formData)
  }

  const canProceed = step === 0 || (step === 1 && tested)
  const fieldsChanged = !tested

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp Business</DialogTitle>
          <DialogDescription>
            Siga os passos para integrar sua conta via Meta Cloud API.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors',
                  i <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    i < step ? 'bg-blue-600' : 'bg-slate-200',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Você precisará das credenciais da Meta Cloud API. Veja como obtê-las:
            </p>
            <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
              <li>
                Acesse o{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Meta App Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Selecione seu app ou crie um novo com tipo "Business"</li>
              <li>
                Vá em <strong>WhatsApp → Getting Started</strong>
              </li>
              <li>
                Copie o <strong>Phone Number ID</strong> e o{' '}
                <strong>WhatsApp Business Account ID</strong>
              </li>
              <li>
                Em <strong>App Settings → System Users</strong>, crie um token com permissão{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">
                  whatsapp_business_messaging
                </code>
              </li>
            </ol>
            <Alert>
              <AlertDescription className="text-xs">
                Seu Access Token é armazenado com segurança e nunca é exibido após o salvamento.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="pnid">Phone Number ID</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">
                      Em WhatsApp → Getting Started, no Meta App Dashboard.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="pnid"
                placeholder="106540000000000"
                value={formData.phone_number_id}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, phone_number_id: e.target.value }))
                  setTested(false)
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="waba">WhatsApp Business Account ID</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">
                      Logo abaixo do Phone Number ID, na mesma página.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="waba"
                placeholder="100000000000000"
                value={formData.waba_id}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, waba_id: e.target.value }))
                  setTested(false)
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="token">System User Access Token</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[220px] text-xs">
                      App Settings → System Users → Generate token. Escopo:
                      whatsapp_business_messaging.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="token"
                type="password"
                placeholder="EAA..."
                value={formData.access_token}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, access_token: e.target.value }))
                  setTested(false)
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !formData.phone_number_id || !formData.access_token}
              className="w-full gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>
            {testResult?.valid && (
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
                  Falha na validação. Verifique o Phone Number ID e o Access Token.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-center py-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="text-center text-sm text-slate-600">
              Credenciais validadas! Clique em salvar para concluir a integração.
            </p>
            <div className="bg-slate-50 border rounded-md p-3 space-y-1 text-xs text-slate-600">
              <div>
                <strong>Phone Number ID:</strong> {formData.phone_number_id}
              </div>
              <div>
                <strong>WABA ID:</strong> {formData.waba_id}
              </div>
              <div>
                <strong>Token:</strong> •••••••••••••••••
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
