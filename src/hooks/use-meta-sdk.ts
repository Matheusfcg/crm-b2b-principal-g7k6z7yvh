import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const META_APP_ID = '2113443072550231'

export function useMetaSdk() {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      if ((window as any).FB) setSdkReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    document.body.appendChild(script)

    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      })
      setSdkReady(true)
    }
  }, [])

  const startEmbeddedSignup = useCallback(
    async (userId: string | undefined, onSuccess?: () => void) => {
      if (!userId) {
        toast.error('Usuário não autenticado.')
        return
      }
      if (!(window as any).FB) {
        toast.error('O Facebook SDK ainda não foi carregado. Tente novamente em instantes.')
        return
      }

      ;(window as any).FB.login(
        (response: any) => {
          if (response.authResponse) {
            exchangeToken(response.authResponse.accessToken, userId, onSuccess)
          } else {
            toast.error('Login com Meta cancelado ou permissões não concedidas.')
          }
        },
        {
          scope: 'whatsapp_business_management,whatsapp_business_messaging',
          extras: { feature: 'whatsapp_embedded_signup' },
        },
      )
    },
    [],
  )

  const exchangeToken = async (accessToken: string, userId: string, onSuccess?: () => void) => {
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
  }

  return { sdkReady, loading, startEmbeddedSignup }
}
