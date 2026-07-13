const SDK_ERROR_PATTERNS = [
  'impression.php',
  'connect.facebook.net',
  'fbcdn',
  'facebook.com',
  'fbq',
  'fbevents',
]

const TELEMETRY_URL_PATTERNS = [
  'facebook.com/platform/impression.php',
  'facebook.com/tr/',
  'facebook.com/platform/log',
  'connect.facebook.net/log',
  'facebook.com/platform/pixel',
]

function isMetaSdkError(text: string): boolean {
  const lower = (text || '').toLowerCase()
  return SDK_ERROR_PATTERNS.some((p) => lower.includes(p))
}

function isTelemetryPing(url: string): boolean {
  const lower = (url || '').toLowerCase()
  return TELEMETRY_URL_PATTERNS.some((p) => lower.includes(p))
}

let installed = false

export function installMetaErrorGuard(): void {
  if (installed) return
  installed = true

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

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as any
      if (target?.src && (target.tagName === 'IMG' || target.tagName === 'SCRIPT')) {
        if (isTelemetryPing(target.src) || isMetaSdkError(target.src)) {
          event.stopPropagation()
          event.preventDefault()
        }
      }
    },
    true,
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const reasonStr = typeof reason === 'string' ? reason : reason?.message || reason?.stack || ''
    if (isMetaSdkError(reasonStr)) {
      event.preventDefault()
      event.stopPropagation()
    }
  })

  const originalFetch = window.fetch
  window.fetch = function (...args: any[]) {
    let url = ''
    try {
      url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    } catch {
      return originalFetch.apply(this, args)
    }
    if (isTelemetryPing(url) || isMetaSdkError(url)) {
      try {
        return originalFetch
          .apply(this, args)
          .then((response: Response) => {
            if (!response || response.status === 0) {
              return new Response('{}', { status: 200 })
            }
            return response
          })
          .catch(() => new Response('{}', { status: 200 }))
      } catch {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
    }
    try {
      return originalFetch.apply(this, args)
    } catch (err) {
      if (isMetaSdkError(String(err))) {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      throw err
    }
  }

  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
    ;(this as any)._metaUrl = typeof url === 'string' ? url : String(url)
    return originalXhrOpen.call(this, method, url, ...rest)
  }
  XMLHttpRequest.prototype.send = function (...args: any[]) {
    const reqUrl = (this as any)._metaUrl || ''
    if (isTelemetryPing(reqUrl) || isMetaSdkError(reqUrl)) {
      this.addEventListener('error', (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
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
      .map((a) => (typeof a === 'string' ? a : a?.message || a?.stack || ''))
      .join(' ')
    if (isMetaSdkError(combined) || isTelemetryPing(combined)) return
    originalConsoleError.apply(console, args)
  }
}
