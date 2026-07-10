import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { ContactAvatar } from './ContactAvatar'

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Ontem'
  return format(date, 'dd/MM/yyyy')
}

export function ConversationItem({
  conv,
  isSelected,
  onSelect,
}: {
  conv: any
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const name = conv.contact?.push_name || conv.contact?.remote_jid?.split('@')[0] || 'Desconhecido'
  const unread = conv.unread_count || 0

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={cn(
        'w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 relative',
        isSelected && 'bg-blue-50/60 hover:bg-blue-50/60',
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
      )}
      <ContactAvatar contact={conv.contact} className="h-12 w-12" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-semibold text-slate-900 truncate pr-2">{name}</span>
          <span
            className={cn(
              'text-xs shrink-0',
              unread > 0 ? 'text-green-600 font-medium' : 'text-slate-400',
            )}
          >
            {formatTime(conv.updated_at)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <p
            className={cn(
              'text-sm truncate',
              unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500',
            )}
          >
            {conv.last_message || 'Nenhuma mensagem'}
          </p>
          {unread > 0 && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
