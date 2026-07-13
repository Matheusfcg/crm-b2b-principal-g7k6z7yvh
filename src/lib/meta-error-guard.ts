const SDK_ERROR_PATTERNS = [
  'impression.php',
  'connect.facebook.net',
  'fbcdn',
  'fbcdn.net',
  'facebook.com',
  'fbq',
  'fbevents',
  'graph.facebook.com',
]

const TELEMETRY_URL_PATTERNS = [
  'facebook.com/platform/impression.php',
  'facebook.com/tr/',
  'facebook.com/platform/log',
  'facebook.com/platform/pixel',
  'connect.facebook.net/log',
  'connect.facebook.net/en_US/fbevents.js',
  'connect.facebook.net/signals/config/',
  'fbcdn.net',
  'graph.facebook.com/v',
  'facebook.com/platform/widget',
  'facebook.com/plugins/',
]

const TELEMETRY_KEYWORDS = [
  'impression.php',
  '/platform/impression',
  '/platform/log',
  '/platform/pixel',
  'fbevents',
  'fbq(',
  'signals/config',
]

function isMetaSdkError(text: string): boolean {
  const lower = (text || '').toLowerCase()
  return SDK_ERROR_PATTERNS.some((p) => lower.includes(p))
}

function isTelemetryPing(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return TELEMETRY_URL_PATTERNS.some((p) => lower.includes(p))
}

function isTelemetryRelatedText(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return TELEMETRY_KEYWORDS.some((p) => lower.includes(p))
}

function isHttpZeroError(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes('status 0') ||
    lower.includes('status: 0') ||
    lower.includes('http 0') ||
    lower.includes('http: 0') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error')
  )
}

function shouldSuppressError(text: string): boolean {
  if (isTelemetryRelatedText(text)) return true
  if (isMetaSdkError(text) && isHttpZeroError(text)) return true
  return false
}

function extractUrl(args: any[]): string {
  if (!args || args.length === 0) return ''
  if (typeof args[0] === 'string') return args[0]
  if (args[0] instanceof Request) {
    try {
      return args[0].url
    } catch {
      return ''
    }
  }
  if (args[0] && typeof args[0].url === 'string') return args[0].url
  if (args[0] && typeof args[0].href === 'string') return args[0].href
  try {
    return String(args[0])
  } catch {
    return ''
  }
}

let installed = false

export function installMetaErrorGuard(): void {
  if (installed) return
  installed = true

  const originalOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = typeof message === 'string' ? message : ''
    const src = source || ''
    const errStr = error?.stack || error?.message || ''
    const combined = `${msg} ${src} ${errStr}`

    if (shouldSuppressError(msg) || shouldSuppressError(src) || shouldSuppressError(errStr)) {
      return true
    }
    if (isMetaSdkError(msg) && isHttpZeroError(combined)) {
      return true
    }
    if (isTelemetryPing(src) || isTelemetryPing(msg)) {
      return true
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error)
    }
    return false
  }

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as any
      if (target && typeof target === 'object') {
        const src = target.src || target.href || ''
        const tagName = target.tagName || ''
        if (
          tagName === 'IMG' ||
          tagName === 'SCRIPT' ||
          tagName === 'LINK' ||
          tagName === 'IFRAME'
        ) {
          if (isTelemetryPing(src) || isMetaSdkError(src)) {
            event.stopPropagation()
            event.preventDefault()
            return
          }
        }
      }
      const message = event.message || ''
      const filename = event.filename || ''
      if (shouldSuppressError(message) || shouldSuppressError(filename)) {
        event.stopPropagation()
        event.preventDefault()
        return
      }
      if (isTelemetryPing(message) || isTelemetryPing(filename)) {
        event.stopPropagation()
        event.preventDefault()
        return
      }
    },
    true,
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const reasonStr =
      typeof reason === 'string'
        ? reason
        : reason?.message || reason?.stack || JSON.stringify(reason) || ''
    if (shouldSuppressError(reasonStr)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (isMetaSdkError(reasonStr) && isHttpZeroError(reasonStr)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (isTelemetryPing(reasonStr)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
  })

  const originalFetch = window.fetch
  window.fetch = function (...args: any[]) {
    const url = extractUrl(args)

    if (isTelemetryPing(url) || isMetaSdkError(url)) {
      try {
        const result = originalFetch.apply(this, args)
        if (result && typeof result.then === 'function') {
          return result
            .then((response: Response) => {
              if (!response || response.status === 0 || response.type === 'opaque') {
                return new Response('{}', {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                })
              }
              return response
            })
            .catch(() => {
              return new Response('{}', {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            })
        }
        return result
      } catch {
        return Promise.resolve(
          new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
    }

    try {
      return originalFetch.apply(this, args)
    } catch (err) {
      const errStr = String(err?.message || err)
      if (isMetaSdkError(errStr) || isTelemetryPing(errStr)) {
        return Promise.resolve(
          new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      throw err
    }
  }

  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
    ;(this as any)._metaUrl = typeof url === 'string' ? url : String(url ?? '')
    ;(this as any)._metaMethod = method
    return originalXhrOpen.call(this, method, url, ...rest)
  }
  XMLHttpRequest.prototype.send = function (...args: any[]) {
    const reqUrl = (this as any)._metaUrl || ''
    if (isTelemetryPing(reqUrl) || isMetaSdkError(reqUrl)) {
      this.addEventListener('error', (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
      })
      this.addEventListener('abort', (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
      })
      Object.defineProperty(this, 'status', {
        get: () => 0,
        configurable: true,
      })
      Object.defineProperty(this, 'readyState', {
        get: () => 4,
        configurable: true,
      })
      Object.defineProperty(this, 'responseText', {
        get: () => '{}',
        configurable: true,
      })
      Object.defineProperty(this, 'response', {
        get: () => '{}',
        configurable: true,
      })
      try {
        return originalXhrSend.apply(this, args)
      } catch {
        return
      }
    }
    return originalXhrSend.apply(this, args)
  }

  const imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
  if (imgSrcDesc && imgSrcDesc.set) {
    const originalImgSrcSet = imgSrcDesc.set
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...imgSrcDesc,
      set(value: string) {
        const strVal = String(value)
        if (isTelemetryPing(strVal) || isMetaSdkError(strVal)) {
          try {
            originalImgSrcSet.call(this, value)
          } catch {
            /* swallow — beacon blocked by adblocker/CORS */
          }
          return
        }
        originalImgSrcSet.call(this, value)
      },
    })
  }

  const scriptSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')
  if (scriptSrcDesc && scriptSrcDesc.set) {
    const originalScriptSrcSet = scriptSrcDesc.set
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      ...scriptSrcDesc,
      set(value: string) {
        const strVal = String(value)
        if (isTelemetryPing(strVal)) {
          try {
            originalScriptSrcSet.call(this, value)
          } catch {
            /* swallow — telemetry script blocked */
          }
          return
        }
        originalScriptSrcSet.call(this, value)
      },
    })
  }

  if (navigator.sendBeacon) {
    const originalSendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = function (url: string, data?: any): boolean {
      if (isTelemetryPing(url) || isMetaSdkError(url)) {
        try {
          return originalSendBeacon(url, data)
        } catch {
          return true
        }
      }
      return originalSendBeacon(url, data)
    }
  }

  const originalConsoleError = console.error
  console.error = function (...args: any[]) {
    const combined = args
      .map((a) => {
        if (typeof a === 'string') return a
        if (a?.message) return a.message
        if (a?.stack) return a.stack
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      })
      .join(' ')

    if (shouldSuppressError(combined)) return
    if (isTelemetryPing(combined)) return
    if (isMetaSdkError(combined) && isHttpZeroError(combined)) return
    originalConsoleError.apply(console, args)
  }

  const originalConsoleWarn = console.warn
  console.warn = function (...args: any[]) {
    const combined = args
      .map((a) => (typeof a === 'string' ? a : a?.message || a?.stack || ''))
      .join(' ')
    if (shouldSuppressError(combined)) return
    if (isTelemetryPing(combined)) return
    if (isMetaSdkError(combined) && isHttpZeroError(combined)) return
    originalConsoleWarn.apply(console, args)
  }
}
