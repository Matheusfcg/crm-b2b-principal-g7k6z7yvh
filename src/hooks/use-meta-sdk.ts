import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: any
  }
}

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      if (window.FB) setSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v23.0',
      })
      setSdkReady(true)
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    document.head.appendChild(script)
  }, [])

  const startEmbeddedSignup = useCallback(
    (_userId?: string, onCode?: (code: string) => void) => {
      if (!sdkReady || !window.FB) {
        toast.error('SDK do Facebook não carregou. Recarregue a página.')
        return
      }

      setLoading(true)
      window.FB.login(
        (response: any) => {
          setLoading(false)

          if (response.status === 'unknown' || !response.authResponse) {
            toast.error('Conexão cancelada pelo usuário.')
            return
          }

          if (response.status !== 'connected') {
            toast.error('Login cancelado.')
            return
          }

          const code = response.authResponse?.code
          if (!code) {
            toast.error('Código de autorização não recebido.')
            return
          }

          onCode?.(code)
        },
        {
          config_id: META_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          scope: 'whatsapp_business_management,whatsapp_business_messaging',
          extras: {
            feature: 'whatsapp_embedded_signup',
            sessionInfoVersion: 3,
          },
        },
      )
    },
    [sdkReady],
  )

  return { sdkReady, loading, startEmbeddedSignup }
}
