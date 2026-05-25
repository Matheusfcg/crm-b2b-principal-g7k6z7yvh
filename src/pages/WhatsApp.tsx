import { useState } from 'react'
import { MessageCircle, QrCode, Smartphone, Wifi, WifiOff, Loader2, LogOut } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function WhatsApp() {
  const { user, profile } = useAuth() as any // handle variations of the auth hook returning user or profile
  const activeUserId = user?.id || profile?.id || '{USER_ID}'

  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)

  const handleConnect = () => {
    setStatus('connecting')
    toast.info('Gerando QR Code...')

    // Simulate API delay to get QR code
    setTimeout(() => {
      // Mock QR code generation for the external provider
      setQrCode(
        `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=crm-wa-mock-${Date.now()}`,
      )

      // Simulate user scanning the code after a few seconds
      setTimeout(() => {
        setStatus('connected')
        setQrCode(null)
        toast.success('WhatsApp conectado com sucesso!')
      }, 5000)
    }, 1500)
  }

  const handleDisconnect = () => {
    setStatus('disconnected')
    setQrCode(null)
    toast.success('WhatsApp desconectado.')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Integration</h1>
          <p className="text-slate-500 text-sm">
            Gerencie a conexão da sua conta do WhatsApp para sincronização automática.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-slate-500" />
              Status da Conexão
            </CardTitle>
            <CardDescription>
              Acompanhe o estado atual da sua integração com o WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            {status === 'connected' ? (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                  <Wifi className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-600">Conectado</h3>
                <p className="text-sm text-slate-500">
                  Sua conta está ativa e sincronizando mensagens automaticamente.
                </p>
                <div className="mt-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 w-full flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Número vinculado</span>
                  <span className="text-sm text-slate-500 font-mono">+55 11 99999-9999</span>
                </div>
              </div>
            ) : status === 'connecting' ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <div>
                  <h3 className="text-lg font-medium text-slate-900">Aguardando leitura...</h3>
                  <p className="text-sm text-slate-500 max-w-[250px] mt-1">
                    Abra o WhatsApp no seu celular e escaneie o QR code ao lado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                  <WifiOff className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700">Desconectado</h3>
                <p className="text-sm text-slate-500">
                  Nenhuma conta vinculada no momento. Conecte para iniciar a automação.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-center p-4">
            {status === 'connected' ? (
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="w-full sm:w-auto gap-2"
              >
                <LogOut className="h-4 w-4" />
                Desconectar Conta
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={status === 'connecting'}
                className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <QrCode className="h-4 w-4" />
                {status === 'connecting' ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-slate-500" />
              Autenticação
            </CardTitle>
            <CardDescription>Escaneie o código para vincular.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px] p-6">
            {qrCode ? (
              <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-[200px] h-[200px]" />
              </div>
            ) : status === 'connected' ? (
              <div className="text-center text-slate-500 flex flex-col items-center gap-2">
                <MessageCircle className="h-10 w-10 text-green-200" />
                <p className="text-sm">Dispositivo autenticado com sucesso.</p>
              </div>
            ) : (
              <div className="text-center text-slate-400 flex flex-col items-center gap-2">
                <QrCode className="h-12 w-12 opacity-50" />
                <p className="text-sm">Clique em "Gerar QR Code" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Configuração de Webhook (Avançado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-2">
            Configure a URL abaixo no seu provedor de API do WhatsApp (ex: Evolution API) para
            receber os eventos em tempo real.
          </p>
          <code className="block p-3 bg-slate-900 text-slate-50 rounded-md text-xs font-mono break-all">
            {`https://${window.location.hostname.replace('preview.goskip.app', 'supabase.co')}/functions/v1/whatsapp-webhook?userId=${activeUserId}`}
          </code>
        </CardContent>
      </Card>
    </div>
  )
}
