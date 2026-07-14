import { supabase } from '@/lib/supabase/client'
import type { WhatsappProvider, SendMessageResult } from './WhatsappProvider'

export class ZApiProvider implements WhatsappProvider {
  private async invoke(fn: string, body: any): Promise<SendMessageResult> {
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body })

      if (error) {
        let errorMsg = 'Erro desconhecido ao processar requisição'
        if (
          error.message &&
          error.message !== 'Function returned an error' &&
          error.message !== 'Invalid response from Function'
        ) {
          errorMsg = error.message
        }
        if (data?.error) {
          errorMsg = typeof data.error === 'string' ? data.error : String(data.error)
        }
        return { success: false, error: errorMsg }
      }

      if (data?.error) {
        const errMsg =
          typeof data.error === 'string' ? data.error : data.error?.message || String(data.error)
        return { success: false, error: errMsg }
      }

      if (data?.success === false) {
        return { success: false, error: data?.message || data?.error || 'Falha ao enviar mensagem' }
      }

      return { success: data?.success ?? !!data?.data, messageId: data?.data?.messageId }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o servidor' }
    }
  }

  async sendText(to: string, text: string): Promise<SendMessageResult> {
    return this.invoke('send-whatsapp-message', { phone: to, message: text })
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', { to, mediaType: 'image', mediaUrl: imageUrl, caption })
  }

  async sendDocument(
    to: string,
    documentUrl: string,
    filename?: string,
  ): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', {
      to,
      mediaType: 'document',
      mediaUrl: documentUrl,
      filename,
    })
  }

  async sendAudio(to: string, audioUrl: string): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', { to, mediaType: 'audio', mediaUrl: audioUrl })
  }

  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', { to, mediaType: 'video', mediaUrl: videoUrl, caption })
  }

  async sendLocation(
    to: string,
    lat: number,
    lng: number,
    name?: string,
  ): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', { to, mediaType: 'location', lat, lng, name })
  }

  async sendContact(to: string, name: string, phone: string): Promise<SendMessageResult> {
    return this.invoke('zapi-send-media', { to, mediaType: 'contact', name, contactPhone: phone })
  }
}
