import { supabase } from '@/lib/supabase/client'
import type { WhatsappProvider, SendMessageResult } from './WhatsappProvider'

export class ZApiProvider implements WhatsappProvider {
  private async invoke(fn: string, body: any): Promise<SendMessageResult> {
    const { data, error } = await supabase.functions.invoke(fn, { body })
    if (error) return { success: false, error: error.message }
    if (data?.error) return { success: false, error: data.error }
    return { success: data?.success ?? false, messageId: data?.data?.messageId }
  }

  async sendText(to: string, text: string): Promise<SendMessageResult> {
    return this.invoke('zapi-send-message', { to, text })
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
