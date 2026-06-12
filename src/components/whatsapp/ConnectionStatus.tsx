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
  onReconnect: () => void
  onDisconnect: () => void
  onForceSync: () => void
  onConfig?: () => void
  error?: string | null
  countdown?: number | null
}

export function ConnectionStatus({
  instance,
  uazapiUrl,
  actionLoading,
  onConnect,
  onReconnect,
  onDisconnect,
  onForceSync,
  onConfig,
  error,
  countdown,
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
          {!instance ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <WifiOff className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-700">
                  Nenhuma instância configurada
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                  Configure os dados da sua instância para sincronizar seu WhatsApp no sistema.
                </p>
                <div className="mt-4 flex justify-center">
                  <Button onClick={onConfig} className="bg-blue-600 text-white hover:bg-blue-700">
                    Configurar Agora
                  </Button>
                </div>
              </div>
            </div>
          ) : isConnected ? (
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                  <Wifi className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-600">Conectado</h3>
                <p className="text-sm text-slate-500">
                  {instance.instance_name
                    ? `Instância: ${instance.instance_name}`
                    : 'Sua conta está ativa e sincronizando.'}
                </p>
              </div>
            </div>
          ) : isNotFound ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <WifiOff className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-orange-600">Instância Não Encontrada</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[320px]">
                  {error ||
                    instance?.last_error ||
                    'A instância configurada não foi encontrada ou está inativa. Contate o administrador.'}
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
                  {instance?.last_error ||
                    'As credenciais da instância estão incorretas. Contate o administrador.'}
                </p>
              </div>
            </div>
          ) : actionLoading ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative h-16 w-16 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                {countdown !== null && (
                  <span className="absolute text-blue-600 font-bold text-lg">{countdown}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Sincronizando...</h3>
                <p className="text-sm text-slate-500 max-w-[250px] mt-1">
                  Sincronizando com WhatsApp... Isso pode levar até 45 segundos.
                </p>
              </div>
            </div>
          ) : isTimeout ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                <WifiOff className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-yellow-600">Tempo Limite Atingido</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                  {instance?.last_error ||
                    error ||
                    'Ocorreu um tempo limite na conexão. A API da Uazapi não respondeu a tempo.'}
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
                {instance?.last_error || 'A conexão com a instância está inativa ou falhou.'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 justify-center p-4">
          {instance && (
            <>
              {isConnected ? (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={onConfig}
                    disabled={actionLoading}
                    className="w-full sm:w-auto gap-2"
                  >
                    Editar Configuração
                  </Button>
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
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {isNotFound ? (
                    <Button
                      onClick={onForceSync}
                      disabled={actionLoading}
                      className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Sincronizar Instância
                    </Button>
                  ) : (
                    <Button
                      onClick={onReconnect}
                      disabled={actionLoading}
                      className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {error || isTimeout || isUnauthorized
                        ? 'Tentar Novamente'
                        : 'Verificar Conexão'}
                    </Button>
                  )}
                  {!isNotFound && (
                    <Button
                      onClick={onForceSync}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full sm:w-auto gap-2"
                    >
                      Sincronizar Conexão
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={onConfig}
                    disabled={actionLoading}
                    className="w-full sm:w-auto gap-2"
                  >
                    Editar Configuração
                  </Button>
                </div>
              )}
            </>
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
          ) : actionLoading ? (
            <div className="text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium">Obtendo QR Code...</p>
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
          ) : !instance ? (
            <div className="text-center text-slate-400 flex flex-col items-center gap-2">
              <QrCode className="h-12 w-12 opacity-50" />
              <p className="text-sm">Configuração pendente.</p>
            </div>
          ) : (
            <div className="text-center text-slate-400 flex flex-col items-center gap-2">
              <QrCode className="h-12 w-12 opacity-50" />
              <p className="text-sm">Clique em "Verificar Conexão" ou "Tentar Novamente".</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
