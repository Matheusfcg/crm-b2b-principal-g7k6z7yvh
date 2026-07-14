import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { installMetaErrorGuard } from '@/lib/meta-error-guard'

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string

function isMetaConfigValid(): boolean {
  if (!META_APP_ID || !META_CONFIG_ID) {
    console.warn(
      '[Meta SDK] Missing environment variables: VITE_META_APP_ID and/or VITE_META_CONFIG_ID. ' +
        'The WhatsApp Embedded Signup flow will not work until these are set.',
    )
    return false
  }
  return true
}

const META_CONFIG_VALID = isMetaConfigValid()

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: any
  }
}

let globalInitCalled = false
let globalInitSucceeded = false

function attemptFbInit(): boolean {
  if (!META_CONFIG_VALID) return false
  if (!window.FB) return false
  try {
    window.FB.init({
      appId: META_APP_ID,
      cookie: true,
      xfbml: true,
      version: 'v21.0',
    })
    globalInitSucceeded = true
    return true
  } catch {
    return false
  }
}

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(globalInitSucceeded)
  const [sdkSlowLoading, setSdkSlowLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sdkFailed, setSdkFailed] = useState(!META_CONFIG_VALID)
  const mountedRef = useRef(true)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyResolversRef = useRef<Array<() => void>>([])

  const notifyReady = useCallback(() => {
    readyResolversRef.current.forEach((resolve) => resolve())
    readyResolversRef.current = []
  }, [])

  const performInit = useCallback(() => {
    if (!META_CONFIG_VALID) return
    if (globalInitSucceeded) {
      if (mountedRef.current) {
        setSdkReady(true)
        setSdkSlowLoading(false)
        notifyReady()
      }
      return
    }
    if (!window.FB) return

    const success = attemptFbInit()
    if (success) {
      globalInitCalled = true
      if (mountedRef.current) {
        setSdkReady(true)
        setSdkSlowLoading(false)
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current)
          slowTimerRef.current = null
        }
        notifyReady()
      }
    } else if (!globalInitCalled) {
      globalInitCalled = true
    }
  }, [notifyReady])

  useEffect(() => {
    mountedRef.current = true
    installMetaErrorGuard()
    return () => {
      mountedRef.current = false
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!META_CONFIG_VALID) {
      setSdkFailed(true)
      return
    }

    if (globalInitSucceeded) {
      setSdkReady(true)
      return
    }

    slowTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !globalInitSucceeded) {
        setSdkSlowLoading(true)
      }
    }, 3000)

    window.fbAsyncInit = performInit

    if (window.FB) {
      performInit()
      if (globalInitSucceeded) {
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current)
          slowTimerRef.current = null
        }
        return
      }
    }

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
      script.onerror = () => {
        if (mountedRef.current && !globalInitSucceeded) {
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
      if (window.FB && !globalInitSucceeded) {
        performInit()
        if (globalInitSucceeded) {
          clearInterval(interval)
        }
      } else if (globalInitSucceeded) {
        clearInterval(interval)
      }
    }, 200)

    const timeout = setTimeout(() => {
      if (!globalInitSucceeded && mountedRef.current) {
        clearInterval(interval)
        if (!window.FB) {
          setSdkFailed(true)
        }
      }
    }, 15000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [performInit])

  const waitForReady = useCallback((timeoutMs: number = 10000): Promise<boolean> => {
    if (globalInitSucceeded) return Promise.resolve(true)
    if (!META_CONFIG_VALID) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs)
      const wrappedResolve = () => {
        clearTimeout(timer)
        resolve(true)
      }
      readyResolversRef.current.push(wrappedResolve)
    })
  }, [])

  const startEmbeddedSignup = useCallback(
    async (_userId?: string, onCode?: (code: string) => void) => {
      if (!META_CONFIG_VALID) {
        toast.error(
          'Configuração do Meta ausente. Defina VITE_META_APP_ID e VITE_META_CONFIG_ID no ambiente.',
        )
        return
      }

      if (globalInitSucceeded && window.FB) {
        // SDK already ready; proceed directly to login below.
      } else if (window.FB && !globalInitSucceeded) {
        setLoading(true)
        const ready = await waitForReady(10000)
        setLoading(false)
        if (!ready || !globalInitSucceeded || !window.FB) {
          toast.error('SDK do Facebook não carregou. Recarregue a página.')
          return
        }
      } else {
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
    [waitForReady],
  )

  return { sdkReady, sdkFailed, sdkSlowLoading, loading, startEmbeddedSignup, waitForReady }
}
