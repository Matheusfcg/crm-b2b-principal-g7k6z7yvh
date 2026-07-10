import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const META_APP_ID = '2113443072550231'
const SDK_TIMEOUT_MS = 15000

const FB_NOISE_PATTERNS = [
  'impression.php',
  'logLoginEvent',
  'fbstatic-a.akamaihd.net',
  'connect.facebook.net/en_US',
  'connect.facebook.net/pt_BR',
  'graph.facebook.com/oauth',
]

function isFacebookSdkNoise(message: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return FB_NOISE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const initTimedOut = useRef(false)

  useEffect(() => {
    const suppressSdkErrors = (event: ErrorEvent) => {
      const msg = event?.message || ''
      const filename = event?.filename || ''
      if (isFacebookSdkNoise(msg) || isFacebookSdkNoise(filename)) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }
      return false
    }

    const suppressUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = typeof event?.reason === 'string' ? event.reason : ''
      if (isFacebookSdkNoise(reason)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('error', suppressSdkErrors, true)
    window.addEventListener('unhandledrejection', suppressUnhandledRejection)

    if (document.getElementById('facebook-jssdk')) {
      if ((window as any).FB) setSdkReady(true)
      return () => {
        window.removeEventListener('error', suppressSdkErrors, true)
        window.removeEventListener('unhandledrejection', suppressUnhandledRejection)
      }
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let resolved = false

    const finish = (success: boolean) => {
      if (resolved) return
      resolved = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
      setSdkReady(success)
    }

    timeoutHandle = setTimeout(() => {
      initTimedOut.current = true
      finish(false)
    }, SDK_TIMEOUT_MS)

    ;(window as any).fbAsyncInit = function () {
      try {
        ;(window as any).FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0',
        })
        finish(true)
      } catch {
        finish(false)
      }
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.onerror = () => finish(false)
    document.body.appendChild(script)

    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      window.removeEventListener('error', suppressSdkErrors, true)
      window.removeEventListener('unhandledrejection', suppressUnhandledRejection)
    }
  }, [])

  const exchangeToken = useCallback(
    async (accessToken: string, userId: string, onSuccess?: () => void) => {
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-meta', {
          body: { action: 'setup_embedded_signup', accessToken, userId },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        toast.success('WhatsApp Business conectado com sucesso!')
        onSuccess?.()
      } catch (err: any) {
        toast.error(`Falha ao configurar via Meta: ${err.message}`)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const startEmbeddedSignup = useCallback(
    async (userId: string | undefined, onSuccess?: () => void) => {
      if (!userId) {
        toast.error('Usuário não autenticado.')
        return
      }

      const fb = (window as any).FB
      if (!fb || typeof fb.login !== 'function') {
        const reason = initTimedOut.current
          ? 'O Facebook SDK não pôde ser carregado (tempo limite). Verifique sua conexão ou bloqueadores de rastreamento.'
          : 'O Facebook SDK ainda não foi carregado. Tente novamente em instantes.'
        toast.error(reason)
        return
      }

      try {
        fb.login(
          (response: any) => {
            if (response?.authResponse) {
              exchangeToken(response.authResponse.accessToken, userId, onSuccess)
            } else if (response?.status === 'closed') {
              toast.info('Login com Meta cancelado pelo usuário.')
            } else {
              toast.error('Login com Meta cancelado ou permissões não concedidas.')
            }
          },
          {
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            extras: { feature: 'whatsapp_embedded_signup' },
          },
        )
      } catch {
        toast.error('Não foi possível abrir o popup do Meta. Verifique bloqueadores de popup.')
      }
    },
    [exchangeToken],
  )

  return { sdkReady, loading, startEmbeddedSignup }
}
