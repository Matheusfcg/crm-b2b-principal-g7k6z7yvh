import { MoreHorizontal, ArrowUpRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const cards = [
  {
    date: '4 Out',
    title: 'Pacote Royal',
    category: 'Oportunidade',
    value: '11,250$',
    color: 'bg-blue-600 text-white',
  },
  {
    date: '16 Out',
    title: 'Terceiro Negócio',
    category: 'Mais Útil',
    value: '21,300$',
    color: 'bg-teal-600 text-white',
  },
  {
    date: '12 Out',
    title: 'Sucesso Absoluto',
    category: 'Negócio Fechado',
    value: '2,100$',
    color: 'bg-black text-white',
    action: true,
  },
  {
    date: '11 Out',
    title: 'Pacote Royal',
    category: 'Oportunidade',
    value: '4,160$',
    color: 'bg-yellow-400 text-gray-900',
  },
  {
    date: '2 Out',
    title: 'Serviços Adaptativos',
    category: 'Negócios',
    value: '3,140$',
    color: 'bg-white text-gray-900 border border-gray-100 shadow-sm',
  },
  {
    date: '2 Out',
    title: 'Segundo Negócio',
    category: 'Serviço Comum',
    value: '12,350$',
    color: 'bg-white text-gray-900 border border-gray-100 shadow-sm',
  },
]

export function InteractionHistory() {
  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Histórico de Interação</h2>
        <div className="flex items-center gap-1 text-gray-400">
          <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const isLight = card.color.includes('bg-white') || card.color.includes('bg-yellow')
          return (
            <div
              key={i}
              className={cn(
                'rounded-[1.5rem] p-5 flex flex-col justify-between min-h-[170px] relative transition-transform hover:-translate-y-1',
                card.color,
              )}
            >
              {card.action && (
                <button className="absolute top-4 right-4 bg-white text-black rounded-full w-9 h-9 flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isLight ? 'text-gray-500' : 'text-white/80',
                  )}
                >
                  {card.date}
                </span>
                {!card.action && (
                  <button
                    className={cn(
                      'p-1',
                      isLight
                        ? 'text-gray-400 hover:text-gray-900'
                        : 'text-white/80 hover:text-white',
                    )}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg leading-tight mb-1 tracking-tight">
                  {card.title}
                </h3>
                <p className={cn('text-[13px] mb-4', isLight ? 'text-gray-500' : 'text-white/80')}>
                  {card.category}
                </p>
                <div className="flex justify-between items-end">
                  <span className="text-[22px] font-bold leading-none">{card.value}</span>
                  <div className="flex -space-x-2">
                    <Avatar
                      className={cn(
                        'w-7 h-7 border-2',
                        isLight ? 'border-white' : 'border-transparent',
                      )}
                    >
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${i}`}
                      />
                    </Avatar>
                    <Avatar
                      className={cn(
                        'w-7 h-7 border-2',
                        isLight ? 'border-white' : 'border-transparent',
                      )}
                    >
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=female&seed=${i + 10}`}
                      />
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
