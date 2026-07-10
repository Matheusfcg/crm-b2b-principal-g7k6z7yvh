import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Image as ImageIcon,
  Music,
  FileText,
  Video,
  Download,
  Sticker,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  RotateCw,
} from 'lucide-react'

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'HH:mm')
}

export function MessageBubble({ msg, onRetry }: { msg: any; onRetry?: () => void }) {
  const type = msg.type || 'text'
  const mediaUrl = msg.media_url
  const filename = msg.media_filename
  const status = msg.status || 'sent'
  const isFailed = status === 'failed'
  const isSending = status === 'sending'

  const renderContent = () => {
    switch (type) {
      case 'image':
        return mediaUrl ? (
          <div className="flex flex-col gap-1">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="rounded-lg max-w-full max-h-72 object-cover cursor-pointer"
              onClick={() => window.open(mediaUrl, '_blank')}
            />
            {msg.content && <span className="text-sm">{msg.content}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content || 'Imagem'}</span>
          </div>
        )
      case 'audio':
        return mediaUrl ? (
          <audio controls className="w-full max-w-[240px] h-9">
            <source src={mediaUrl} />
          </audio>
        ) : (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content || 'Áudio'}</span>
          </div>
        )
      case 'document':
        return mediaUrl ? (
          <a
            href={mediaUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline min-w-[180px]"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{filename || 'Documento'}</span>
            <Download className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content || filename || 'Documento'}</span>
          </div>
        )
      case 'video':
        return mediaUrl ? (
          <video controls className="rounded-lg max-w-full max-h-72">
            <source src={mediaUrl} />
          </video>
        ) : (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content || 'Vídeo'}</span>
          </div>
        )
      case 'sticker':
        return mediaUrl ? (
          <img src={mediaUrl} alt="Sticker" className="max-w-32 max-h-32 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <Sticker className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content || 'Sticker'}</span>
          </div>
        )
      default:
        return <span>{msg.content}</span>
    }
  }

  const hasVisualMedia = mediaUrl && ['image', 'video'].includes(type)

  const renderStatus = () => {
    if (!msg.from_me) return null
    if (isFailed) return <AlertCircle className="h-3 w-3 text-red-500" />
    if (isSending) return <Clock className="h-3 w-3 text-slate-400" />
    if (status === 'read' || status === 'delivered')
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
    return <Check className="h-3.5 w-3.5 text-slate-400" />
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-2 shadow-sm text-[15px] break-words whitespace-pre-wrap relative group',
          msg.from_me
            ? 'bg-[#D9FDD3] text-slate-800 self-end rounded-tr-none'
            : 'bg-white text-slate-800 self-start rounded-tl-none',
          isFailed && 'bg-red-50 border border-red-200',
        )}
      >
        <div className={cn('pb-3 pr-6 leading-relaxed', hasVisualMedia && 'p-1')}>
          {renderContent()}
        </div>
        <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
          <span className="text-[10px] text-slate-500/80 font-medium select-none">
            {formatTime(msg.timestamp)}
          </span>
          {renderStatus()}
        </div>
      </div>
      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          className="self-end mt-1 mr-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
        >
          <RotateCw className="h-3 w-3" /> Tentar novamente
        </button>
      )}
    </div>
  )
}
