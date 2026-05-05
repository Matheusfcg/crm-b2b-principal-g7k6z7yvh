import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, CircleDollarSign, CheckCircle2 } from 'lucide-react'

export function OverviewCards() {
  const cards = [
    {
      title: 'Leads Totais',
      value: '2.543',
      subtitle: '+12% em relação ao mês passado',
      icon: Users,
    },
    {
      title: 'Oportunidades Abertas',
      value: '342',
      subtitle: '+5% em relação ao mês passado',
      icon: Target,
    },
    {
      title: 'Valor em Pipeline',
      value: 'R$ 1.2M',
      subtitle: '+18% em relação ao mês passado',
      icon: CircleDollarSign,
    },
    {
      title: 'Tarefas para Hoje',
      value: '12',
      subtitle: '4 atrasadas',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
