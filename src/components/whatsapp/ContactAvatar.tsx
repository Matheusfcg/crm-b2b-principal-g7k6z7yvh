import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function ContactAvatar({ contact, className }: { contact: any; className?: string }) {
  let src: string | null = null
  const raw = contact?.profile_picture
  if (typeof raw === 'string' && raw.length > 0) {
    if (raw.startsWith('http')) {
      try {
        new URL(raw)
        src = raw
      } catch {
        src = null
      }
    } else if (raw.startsWith('data:image')) {
      src = raw
    }
  }

  const name = contact?.push_name || contact?.remote_jid?.split('@')[0] || 'Desconhecido'

  return (
    <Avatar className={cn('border border-slate-200 shadow-sm shrink-0', className)}>
      <AvatarImage src={src || undefined} alt={name} />
      <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
        {name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
