import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockActivities } from '@/lib/mock-data'
import { User, FileText, Calendar, CheckCircle, Mail } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  user: User,
  file: FileText,
  calendar: Calendar,
  check: CheckCircle,
  mail: Mail,
}

export function RecentActivity() {
  return (
    <Card className="shadow-sm border-border/50 h-full">
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {mockActivities.map((activity, i) => {
            const Icon = iconMap[activity.icon] || User
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.desc}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
