export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface WhatsappProvider {
  sendText(to: string, text: string): Promise<SendMessageResult>
  sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResult>
  sendDocument(to: string, documentUrl: string, filename?: string): Promise<SendMessageResult>
  sendAudio(to: string, audioUrl: string): Promise<SendMessageResult>
  sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendMessageResult>
  sendLocation(to: string, lat: number, lng: number, name?: string): Promise<SendMessageResult>
  sendContact(to: string, name: string, phone: string): Promise<SendMessageResult>
}

export type ProviderType = 'z-api' | 'meta' | 'evolution' | 'twilio'
