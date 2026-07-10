import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Image as ImageIcon, Music, FileText, Video, Sticker } from 'lucide-react'

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'HH:mm')
}

export function MessageBubble({ msg }: { msg: any }) {
  const type = msg.type || 'text'

  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content}</span>
          </div>
        )
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content}</span>
          </div>
        )
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content}</span>
          </div>
        )
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content}</span>
          </div>
        )
      case 'sticker':
        return (
          <div className="flex items-center gap-2">
            <Sticker className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{msg.content}</span>
          </div>
        )
      default:
        return <span>{msg.content}</span>
    }
  }

  return (
    <div
      className={cn(
        'max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-2 shadow-sm text-[15px] break-words whitespace-pre-wrap relative group',
        msg.from_me
          ? 'bg-[#D9FDD3] text-slate-800 self-end rounded-tr-none'
          : 'bg-white text-slate-800 self-start rounded-tl-none',
      )}
    >
      <div className="pb-3 pr-6 leading-relaxed">{renderContent()}</div>
      <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
        <span className="text-[10px] text-slate-500/80 font-medium select-none">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  )
}
