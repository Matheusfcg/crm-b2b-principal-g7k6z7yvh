import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const META_APP_ID = '2113443072550231'
const SDK_TIMEOUT_MS = 15000

const TELEMETRY_PATTERNS = [
  'impression.php',
  'facebook.com/platform/impression',
  'www.facebook.com/platform/impression',
  'facebook.com/tr/',
  'fbevents.js',
  'facebook.net/en_US/fbevents',
  'fbstatic-a.akamaihd.net',
  'logLoginEvent',
]

const NOISE_MESSAGE_PATTERNS = [
  'impression.php',
  'logLoginEvent',
  'fbstatic-a.akamaihd.net',
  'connect.facebook.net/en_US',
  'connect.facebook.net/pt_BR',
  'facebook.com/platform/impression',
  'www.facebook.com/platform/impression',
  'facebook.com/tr/',
  'facebook.net/en_US/fbevents',
  'fbevents.js',
]

const FETCH_CANCEL_PATTERNS = [
  'error retrieving login status',
  'fetch cancelled',
  'failed to fetch',
  'networkerror',
]

function isTelemetryUrl(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return TELEMETRY_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

function isNoiseMessage(message: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return NOISE_MESSAGE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

function isFetchCancelError(message: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return FETCH_CANCEL_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

function extractResourceUrl(event: Event): string | null {
  const target = event.target as any
  if (!target) return null
  if (typeof target.src === 'string' && target.src) return target.src
  if (typeof target.href === 'string' && target.href) return target.href
  if (target?.currentSrc && typeof target.currentSrc === 'string') return target.currentSrc
  return null
}

function extractFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  if (input && typeof input === 'object' && 'url' in input) return String((input as any).url)
  return ''
}

const FAKE_OK_RESPONSE = () =>
  new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const initTimedOut = useRef(false)

  useEffect(() => {
    const suppressSdkErrors = (event: Event) => {
      const errorEvent = event as ErrorEvent
      const msg = errorEvent?.message || ''
      const filename = errorEvent?.filename || ''

      if (isNoiseMessage(msg) || isNoiseMessage(filename)) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }

      if (isFetchCancelError(msg)) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }

      const resourceUrl = extractResourceUrl(event)
      if (resourceUrl && isTelemetryUrl(resourceUrl)) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }

      return false
    }

    const suppressUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason
      const reasonStr = typeof reason === 'string' ? reason : ''
      if (isNoiseMessage(reasonStr) || isFetchCancelError(reasonStr)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (reason && typeof reason === 'object') {
        const reasonText = JSON.stringify(reason).toLowerCase()
        if (isNoiseMessage(reasonText) || isFetchCancelError(reasonText)) {
          event.preventDefault()
          event.stopPropagation()
        }
      }
    }

    const suppressResourceError = (event: Event) => {
      const resourceUrl = extractResourceUrl(event)
      if (resourceUrl && isTelemetryUrl(resourceUrl)) {
        event.preventDefault()
        event.stopPropagation()
        return true
      }
      return false
    }

    window.addEventListener('error', suppressSdkErrors, true)
    window.addEventListener('unhandledrejection', suppressUnhandledRejection)
    window.addEventListener('error', suppressResourceError, true)

    const originalConsoleError = console.error
    console.error = function (...args: any[]) {
      const combined = args
        .map((a) => (typeof a === 'string' ? a : a?.message || ''))
        .join(' ')
        .toLowerCase()
      if (isFetchCancelError(combined) || isNoiseMessage(combined)) {
        return
      }
      return originalConsoleError.apply(console, args)
    }

    if (document.getElementById('facebook-jssdk')) {
      if ((window as any).FB) setSdkReady(true)
      return () => {
        window.removeEventListener('error', suppressSdkErrors, true)
        window.removeEventListener('unhandledrejection', suppressUnhandledRejection)
        window.removeEventListener('error', suppressResourceError, true)
        console.error = originalConsoleError
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

    const originalFetch = window.fetch
    window.fetch = function (this: typeof window, ...args: Parameters<typeof fetch>) {
      const url = extractFetchUrl(args[0])
      if (isTelemetryUrl(url)) {
        try {
          return originalFetch
            .apply(this, args)
            .then(
              (response: Response) => {
                if (
                  !response ||
                  response.status === 0 ||
                  response.type === 'opaque' ||
                  response.type === 'error'
                ) {
                  return FAKE_OK_RESPONSE()
                }
                return response
              },
              () => FAKE_OK_RESPONSE(),
            )
            .catch(() => FAKE_OK_RESPONSE())
        } catch {
          return Promise.resolve(FAKE_OK_RESPONSE())
        }
      }
      return originalFetch.apply(this, args)
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open
    const originalXhrSend = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
      ;(this as any).__fbTelemetryUrl = url
      return originalXhrOpen.call(this, method, url, ...rest)
    }
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...sendArgs: any[]) {
      const telemetryUrl = (this as any).__fbTelemetryUrl as string
      if (telemetryUrl && isTelemetryUrl(telemetryUrl)) {
        const dispatchSpoofedLoad = (target: XMLHttpRequest) => () => {
          try {
            Object.defineProperty(target, 'readyState', { value: 2, configurable: true })
            target.dispatchEvent(new Event('readystatechange'))
            Object.defineProperty(target, 'readyState', { value: 3, configurable: true })
            target.dispatchEvent(new Event('readystatechange'))
            Object.defineProperty(target, 'status', { value: 200, configurable: true })
            Object.defineProperty(target, 'statusText', { value: 'OK', configurable: true })
            Object.defineProperty(target, 'responseText', { value: '{}', configurable: true })
            Object.defineProperty(target, 'response', { value: '{}', configurable: true })
            Object.defineProperty(target, 'readyState', { value: 4, configurable: true })
            target.dispatchEvent(new Event('readystatechange'))
            target.dispatchEvent(new Event('load'))
            target.dispatchEvent(new Event('loadend'))
          } catch {
            // ignore property definition errors
          }
        }
        this.addEventListener('error', (e: Event) => {
          e.stopPropagation()
          e.preventDefault()
        })
        this.addEventListener('abort', (e: Event) => {
          e.stopPropagation()
          e.preventDefault()
        })
        setTimeout(dispatchSpoofedLoad(this), 0)
        return
      }
      return originalXhrSend.apply(this, sendArgs)
    }

    const originalSendBeacon = navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : undefined
    if (originalSendBeacon) {
      ;(navigator as any).sendBeacon = function (url: string, data?: any): boolean {
        if (isTelemetryUrl(url)) {
          return true
        }
        return originalSendBeacon(url, data)
      }
    }

    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      window.removeEventListener('error', suppressSdkErrors, true)
      window.removeEventListener('unhandledrejection', suppressUnhandledRejection)
      window.removeEventListener('error', suppressResourceError, true)
      console.error = originalConsoleError
      window.fetch = originalFetch
      XMLHttpRequest.prototype.open = originalXhrOpen
      XMLHttpRequest.prototype.send = originalXhrSend
      if (originalSendBeacon) {
        ;(navigator as any).sendBeacon = originalSendBeacon
      }
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
