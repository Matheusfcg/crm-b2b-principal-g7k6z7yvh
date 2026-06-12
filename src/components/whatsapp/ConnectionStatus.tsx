import {
  MessageCircle,
  QrCode,
  Smartphone,
  Wifi,
  WifiOff,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ConnectionStatusProps {
  instance: any
  uazapiUrl?: string | null
  actionLoading: boolean
  onConnect: () => void
  onDisconnect: () => void
  error?: string | null
}

export function ConnectionStatus({
  instance,
  actionLoading,
  onConnect,
  onDisconnect,
  error,
}: ConnectionStatusProps) {
  const status = instance?.status || 'disconnected'
  const isConnected = status === 'open' || status === 'connected'
  const isConnecting = status === 'connecting' || status === 'qrcode' || instance?.is_connecting
  const isNotFound = status === 'not_found'
  const isTimeout = status === 'timeout'
  const isUnauthorized = status === 'unauthorized'

  const rawQr = instance?.qrcode
  const isValidBase64 = rawQr && typeof rawQr === 'string' && rawQr.length > 20

  let qrcodeSrc = null
  if (isValidBase64) {
    qrcodeSrc =
      rawQr.startsWith('data:image') || rawQr.startsWith('http')
        ? rawQr
        : `data:image/png;base64,${rawQr}`
  }

  const isGeneratingQr = actionLoading || (isConnecting && !qrcodeSrc && !error)

  return (
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
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 min-h-[250px]">
          {isConnected ? (
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                  <Wifi className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-600">Conectado</h3>
                <p className="text-sm text-slate-500">
                  Sua conta está ativa e sincronizando mensagens automaticamente.
                </p>
              </div>

              <div className="bg-[#1d334a] text-white p-6 rounded-xl space-y-5 font-sans shadow-sm w-full text-left">
                <h2 className="text-xl font-bold border-b border-[#2c4b69] pb-3">
                  Dados da instância
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-[#8ba3b8] text-sm mb-1">Server URL:</p>
                    <p className="font-bold break-all text-[15px]">
                      {instance?.server_url || uazapiUrl || 'https://apiwhatsvexaview.uazapi.com'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#8ba3b8] text-sm mb-1">Instance Token:</p>
                    <p className="font-bold break-all text-[15px]">
                      {instance?.instance_token || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#8ba3b8] text-sm mb-1">Número conectado:</p>
                    <p className="font-bold text-[15px]">{instance?.phone || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-[#8ba3b8] text-sm mb-1">Status:</p>
                    <p className="font-bold text-[15px]">{instance?.status || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : isNotFound ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <WifiOff className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-orange-600">Instância Não Encontrada</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                  A instância não foi encontrada ou foi desconectada. Clique em "Conectar WhatsApp"
                  para inicializar uma nova.
                </p>
              </div>
            </div>
          ) : isUnauthorized ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <WifiOff className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-600">Falha de Autenticação</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                  Erro de Autenticação: Verifique seu Token e Instance ID nas configurações. Clique
                  em "Reconectar" para tentar novamente.
                </p>
              </div>
            </div>
          ) : isGeneratingQr ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {instance?.is_connecting || status === 'connecting'
                    ? 'Aguardando inicialização...'
                    : 'Criando instância...'}
                </h3>
                <p className="text-sm text-slate-500 max-w-[250px] mt-1">
                  Aguarde enquanto preparamos a conexão e geramos seu QR Code.
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
          {isConnected || isGeneratingQr || !!qrcodeSrc ? (
            <Button
              variant="destructive"
              onClick={onDisconnect}
              disabled={actionLoading}
              className="w-full sm:w-auto gap-2"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Desconectar Conta
            </Button>
          ) : (
            <Button
              onClick={onConnect}
              disabled={actionLoading}
              className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : instance?.id &&
                (error ||
                  isTimeout ||
                  isUnauthorized ||
                  isNotFound ||
                  status === 'disconnected') ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {instance?.id &&
              (error || isTimeout || isUnauthorized || isNotFound || status === 'disconnected')
                ? 'Reconectar'
                : 'Conectar WhatsApp'}
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
        <CardContent className="flex items-center justify-center min-h-[250px] p-6">
          {qrcodeSrc ? (
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
              <img
                src={qrcodeSrc}
                alt="WhatsApp QR Code"
                className="w-[200px] h-[200px] object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src =
                    'https://img.usecurling.com/i?q=qr-code-error&color=gray'
                }}
              />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 flex flex-col items-center gap-3 max-w-[250px]">
              <WifiOff className="h-8 w-8" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : isGeneratingQr ? (
            <div className="text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium">
                {instance?.is_connecting || status === 'connecting'
                  ? 'Aguardando inicialização...'
                  : 'Gerando QR Code...'}
              </p>
            </div>
          ) : isConnected ? (
            <div className="text-center text-slate-500 flex flex-col items-center gap-2">
              <MessageCircle className="h-10 w-10 text-green-200" />
              <p className="text-sm">Dispositivo autenticado com sucesso.</p>
            </div>
          ) : isNotFound ? (
            <div className="text-center text-slate-400 flex flex-col items-center gap-2">
              <WifiOff className="h-12 w-12 opacity-50 text-red-500" />
              <p className="text-sm">Instância não sincronizada.</p>
            </div>
          ) : isUnauthorized ? (
            <div className="text-center text-red-400 flex flex-col items-center gap-2">
              <WifiOff className="h-12 w-12 opacity-50 text-red-500" />
              <p className="text-sm">Não autorizado (401).</p>
            </div>
          ) : (
            <div className="text-center text-slate-400 flex flex-col items-center gap-2">
              <QrCode className="h-12 w-12 opacity-50" />
              <p className="text-sm">Clique em "Conectar WhatsApp" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
