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

interface ConnectionStatusProps {
  instance: any
  actionLoading: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectionStatus({
  instance,
  actionLoading,
  onConnect,
  onDisconnect,
}: ConnectionStatusProps) {
  const status = instance?.status || 'disconnected'
  const isConnected = status === 'open'
  const isConnecting = status === 'connecting'
  const qrcodeSrc = instance?.qrcode

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
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                <Wifi className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-600">Conectado</h3>
              <p className="text-sm text-slate-500">
                Sua conta está ativa e sincronizando mensagens automaticamente.
              </p>
              <div className="mt-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 w-full flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-slate-700">Número</span>
                  <span className="text-sm text-slate-500 font-mono truncate max-w-[150px]">
                    {instance?.phone || 'Desconhecido'}
                  </span>
                </div>
                <div className="flex items-center justify-between w-full border-t border-slate-100 pt-2">
                  <span className="text-sm font-medium text-slate-700">Instância</span>
                  <span className="text-sm text-slate-500 font-mono truncate max-w-[150px]">
                    {instance?.instance_name}
                  </span>
                </div>
              </div>
            </div>
          ) : isConnecting ? (
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
          {isConnected || isConnecting ? (
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
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Conectar WhatsApp
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
          {qrcodeSrc && isConnecting ? (
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
              <img src={qrcodeSrc} alt="WhatsApp QR Code" className="w-[200px] h-[200px]" />
            </div>
          ) : isConnected ? (
            <div className="text-center text-slate-500 flex flex-col items-center gap-2">
              <MessageCircle className="h-10 w-10 text-green-200" />
              <p className="text-sm">Dispositivo autenticado com sucesso.</p>
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
