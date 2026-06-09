import { useEffect, useState } from 'react'
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
  uazapiUrl,
  actionLoading,
  onConnect,
  onDisconnect,
  error,
}: ConnectionStatusProps) {
  const status = instance?.status || 'disconnected'
  const isConnected = status === 'open' || status === 'connected'
  const isConnecting = status === 'connecting' || status === 'qrcode'
  const isNotFound = status === 'not_found'
  const isTimeout = status === 'timeout'

  const rawQr = instance?.qrcode
  const isValidBase64 = rawQr && typeof rawQr === 'string' && rawQr.length > 20
  const qrcodeSrcBase64 = isValidBase64
    ? rawQr.startsWith('data:image')
      ? rawQr
      : `data:image/png;base64,${rawQr}`
    : null

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [isFetchingBlob, setIsFetchingBlob] = useState(false)

  const shouldFetchDirect =
    !isValidBase64 && (status === 'connecting' || status === 'qrcode') && instance?.instance_name

  useEffect(() => {
    let isMounted = true
    let currentBlobUrl: string | null = null

    const fetchImg = async () => {
      setIsFetchingBlob(true)
      setImgError(false)
      try {
        const url = `https://uazapi.com/instance/qrcode?instance=${instance.instance_name}`
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${instance.instance_token || ''}`,
          },
        })
        if (!res.ok) throw new Error('Failed to fetch image')
        const blob = await res.blob()
        if (isMounted) {
          currentBlobUrl = URL.createObjectURL(blob)
          setBlobUrl(currentBlobUrl)
        }
      } catch (err) {
        if (isMounted) {
          setImgError(true)
        }
      } finally {
        if (isMounted) {
          setIsFetchingBlob(false)
        }
      }
    }

    if (shouldFetchDirect) {
      fetchImg()
    } else {
      setBlobUrl(null)
      setImgError(false)
    }

    return () => {
      isMounted = false
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [shouldFetchDirect, instance?.instance_name, instance?.instance_token])

  const qrcodeSrc = qrcodeSrcBase64 || blobUrl

  const isGeneratingQr = actionLoading || (isConnecting && !qrcodeSrc && !imgError)

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
                  <span className="text-sm font-medium text-slate-700">ID da Conexão</span>
                  <span className="text-sm text-slate-500 font-mono truncate max-w-[150px]">
                    {instance?.id?.split('-')[0] || 'N/A'}
                  </span>
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
          ) : isGeneratingQr ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">Criando instância...</h3>
                <p className="text-sm text-slate-500 max-w-[250px] mt-1">
                  Aguarde enquanto geramos seu QR Code.
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
          {isConnected || isGeneratingQr || !!qrcodeSrc || !!directImageUrl ? (
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
              ) : error || isTimeout ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {error || isTimeout ? 'Tentar Novamente' : 'Conectar WhatsApp'}
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
          {qrcodeSrc || directImageUrl ? (
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
              <img
                src={qrcodeSrc || directImageUrl!}
                alt="WhatsApp QR Code"
                className="w-[200px] h-[200px]"
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
              <p className="text-sm font-medium">Gerando QR Code...</p>
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
