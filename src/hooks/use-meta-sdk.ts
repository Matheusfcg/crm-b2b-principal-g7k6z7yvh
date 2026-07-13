import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: any
  }
}

let globalInitCalled = false

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const performInit = () => {
      if (globalInitCalled || !window.FB) return
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      })
      globalInitCalled = true
      if (mountedRef.current) setSdkReady(true)
    }

    if (globalInitCalled) {
      setSdkReady(true)
      return
    }

    window.fbAsyncInit = performInit

    if (window.FB) {
      performInit()
      return
    }

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
      document.head.appendChild(script)
    }

    const interval = setInterval(() => {
      if (window.FB && !globalInitCalled) {
        performInit()
        clearInterval(interval)
      } else if (globalInitCalled) {
        clearInterval(interval)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])

  const startEmbeddedSignup = useCallback(
    (_userId?: string, onCode?: (code: string) => void) => {
      if (!sdkReady || !window.FB || !globalInitCalled) {
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
