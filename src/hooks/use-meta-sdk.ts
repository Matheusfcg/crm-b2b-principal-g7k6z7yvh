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
let errorSuppressionInstalled = false

const SDK_ERROR_PATTERNS = [
  'impression.php',
  'connect.facebook.net',
  'fbcdn',
  'facebook.com',
  'fbq',
  'fbevents',
]

function isMetaSdkError(text: string): boolean {
  const lower = (text || '').toLowerCase()
  return SDK_ERROR_PATTERNS.some((p) => lower.includes(p))
}

function isTelemetryPing(url: string): boolean {
  return url.toLowerCase().includes('facebook.com/platform/impression.php')
}

function installErrorSuppression() {
  if (errorSuppressionInstalled) return
  errorSuppressionInstalled = true

  const originalOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = typeof message === 'string' ? message : ''
    const src = source || ''
    if (isMetaSdkError(msg) || isMetaSdkError(src)) return true
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error)
    }
    return false
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const reasonStr = typeof reason === 'string' ? reason : reason?.message || reason?.stack || ''
    if (isMetaSdkError(reasonStr)) {
      event.preventDefault()
      event.stopPropagation()
    }
  })

  const originalFetch = window.fetch
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''

    if (isTelemetryPing(url)) {
      return originalFetch
        .apply(this, args)
        .then((response) => {
          if (response.status === 0) {
            return new Response('{}', { status: 200 })
          }
          return response
        })
        .catch(() => new Response('{}', { status: 200 }))
    }

    if (isMetaSdkError(url)) {
      return originalFetch.apply(this, args).catch(() => new Response('{}', { status: 200 }))
    }

    return originalFetch.apply(this, args)
  }
}

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkSlowLoading, setSdkSlowLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sdkFailed, setSdkFailed] = useState(false)
  const mountedRef = useRef(true)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    installErrorSuppression()
    return () => {
      mountedRef.current = false
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const performInit = () => {
      if (globalInitCalled || !window.FB) return
      try {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v21.0',
        })
      } catch {
        // FB.init can throw if background tracking fails — non-critical
      }
      globalInitCalled = true
      if (mountedRef.current) {
        setSdkReady(true)
        setSdkSlowLoading(false)
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current)
          slowTimerRef.current = null
        }
      }
    }

    if (globalInitCalled) {
      setSdkReady(true)
      return
    }

    slowTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !globalInitCalled) {
        setSdkSlowLoading(true)
      }
    }, 3000)

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
      script.onerror = () => {
        if (mountedRef.current && !globalInitCalled) {
          setSdkFailed(true)
          if (slowTimerRef.current) {
            clearTimeout(slowTimerRef.current)
            slowTimerRef.current = null
          }
        }
      }
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

    const timeout = setTimeout(() => {
      if (!globalInitCalled && mountedRef.current) {
        clearInterval(interval)
      }
    }, 15000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [])

  const startEmbeddedSignup = useCallback(
    (_userId?: string, onCode?: (code: string) => void) => {
      if (!sdkReady || !window.FB || !globalInitCalled) {
        toast.error('SDK do Facebook não carregou. Recarregue a página.')
        return
      }

      setLoading(true)
      try {
        window.FB.login(
          (response: any) => {
            setLoading(false)

            if (!response) {
              toast.error('Resposta inválida do Facebook. Tente novamente.')
              return
            }

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
      } catch {
        setLoading(false)
        toast.error('Erro ao iniciar conexão. Tente novamente.')
      }
    },
    [sdkReady],
  )

  return { sdkReady, sdkFailed, sdkSlowLoading, loading, startEmbeddedSignup }
}
