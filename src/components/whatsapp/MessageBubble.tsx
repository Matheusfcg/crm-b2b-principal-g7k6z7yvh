import { Clock, AlertCircle, Check, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  direction: string | null
  type: string | null
  text: string | null
  mediaUrl: string | null
  status: string | null
  createdAt: string | null
}

export function MessageBubble({
  direction,
  type,
  text,
  mediaUrl,
  status,
  createdAt,
}: MessageBubbleProps) {
  const isOutbound = direction === 'outbound' || direction === 'outgoing'

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'whatsapp-bubble relative max-w-[75%] rounded-lg px-2.5 py-1.5 shadow-sm text-sm break-words',
          isOutbound ? 'whatsapp-bubble-sent' : 'whatsapp-bubble-received',
        )}
      >
        {mediaUrl && type === 'image' && (
          <img src={mediaUrl} alt="" className="rounded-lg max-w-full max-h-60 mb-1" />
        )}
        {mediaUrl && type === 'audio' && (
          <audio controls src={mediaUrl} className="w-full max-w-[240px] mb-1" />
        )}
        {mediaUrl && type === 'video' && (
          <video controls src={mediaUrl} className="rounded-lg max-w-full max-h-60 mb-1" />
        )}
        {mediaUrl && type === 'document' && (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            📄 {text || 'Documento'}
          </a>
        )}
        {text && type !== 'document' && <span className="whatsapp-msg-text">{text}</span>}
        <span className="whatsapp-msg-meta">
          {createdAt ? format(new Date(createdAt), 'HH:mm') : ''}
          {status === 'sending' && <Clock className="inline h-3 w-3 ml-1 animate-spin" />}
          {status === 'failed' && <AlertCircle className="inline h-3 w-3 ml-1 text-red-500" />}
          {status === 'sent' && isOutbound && <Check className="inline h-3 w-3 ml-0.5" />}
          {status === 'received' && isOutbound && <CheckCheck className="inline h-3 w-3 ml-0.5" />}
        </span>
      </div>
    </div>
  )
}
