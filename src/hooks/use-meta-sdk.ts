import { toast } from 'sonner'

export function useMetaSdk() {
  return {
    sdkReady: true,
    loading: false,
    startEmbeddedSignup: (_userId?: string, _onSuccess?: () => void) => {
      toast.info('Use o assistente de configuração para conectar seu WhatsApp Business.')
    },
  }
}
