import { useEffect, useState } from 'react'
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const areaData = [
  { month: 'Jan', tickets: 100, resolutions: 120 },
  { month: 'Fev', tickets: 130, resolutions: 140 },
  { month: 'Mar', tickets: 170, resolutions: 180 },
  { month: 'Abr', tickets: 200, resolutions: 210 },
  { month: 'Mai', tickets: 240, resolutions: 260 },
  { month: 'Jun', tickets: 280, resolutions: 290 },
]

const pieData = [
  { name: 'Novo', value: 400, color: '#3b82f6' },
  { name: 'Contato Feito', value: 300, color: '#10b981' },
  { name: 'Proposta', value: 300, color: '#0f766e' },
  { name: 'Negociação', value: 200, color: '#f59e0b' },
]

export default function Reports() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    leads: 1248,
    tarefas: 34,
    propostas: 0,
    pipeline: 0,
    receita: 542300,
  })

  useEffect(() => {
    async function loadStats() {
      if (!profile) return

      try {
        let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
        let tasksQuery = supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente')

        const role = profile.role?.toLowerCase()

        if (role !== 'admin' && role !== 'gerente') {
          leadsQuery = leadsQuery.eq('created_by', profile.id)
          tasksQuery = tasksQuery.eq('user_id', profile.id)
        }

        const [leadsRes, tasksRes] = await Promise.all([leadsQuery, tasksQuery])

        setStats((prev) => ({
          ...prev,
          leads: leadsRes.count && leadsRes.count > 0 ? leadsRes.count : prev.leads,
          tarefas: tasksRes.count && tasksRes.count > 0 ? tasksRes.count : prev.tarefas,
        }))
      } catch (e) {
        console.error('Erro ao carregar estatísticas do painel:', e)
      }
    }
    loadStats()
  }, [profile])

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[#f8fafc] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Fluxo de Vendas e Jornada do Cliente
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">Total de Leads</p>
                <h3 className="text-3xl font-bold text-slate-900">
                  {stats.leads.toLocaleString()}
                </h3>
                <p className="text-[13px] text-slate-500 mt-2 flex items-center gap-1">
                  <span className="text-emerald-500 font-medium">+20.1%</span>
                  em relação ao mês passado
                </p>
              </div>
              <div className="text-slate-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">Conversão</p>
                <h3 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  15.2%
                  <TrendingUp className="h-5 w-5 text-slate-900" />
                </h3>
                <p className="text-[13px] text-slate-500 mt-2 flex items-center gap-1">
                  <span className="text-emerald-500 font-medium">+2.4%</span>
                  em relação ao mês passado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">Receita Estimada</p>
                <h3 className="text-3xl font-bold text-slate-900">
                  R$ {(stats.receita / 1000).toFixed(1)}k
                </h3>
                <p className="text-[13px] text-slate-500 mt-2 flex items-center gap-1">
                  <span className="text-emerald-500 font-medium">+12%</span>
                  em relação ao mês passado
                </p>
              </div>
              <div className="text-slate-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">Atividades Ativas</p>
                <h3 className="text-3xl font-bold text-slate-900">{stats.tarefas}</h3>
                <p className="text-[13px] text-slate-500 mt-2">
                  <span className="text-slate-600 font-medium">4 urgentes para hoje</span>
                </p>
              </div>
              <div className="text-slate-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px] lg:col-span-2">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-[1.1rem]">Jornada de Vendas</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Volume de tickets e resoluções nos últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[280px] w-full mt-4">
              <ChartContainer
                config={{
                  tickets: { label: 'Tickets', color: '#60a5fa' },
                  resolutions: { label: 'Resoluções', color: '#818cf8' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="tickets"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTickets)"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolutions"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px]">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-[1.1rem]">Distribuição de Pipeline</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Status atual das oportunidades de venda.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[280px] w-full flex items-center justify-center mt-4">
              <ChartContainer config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
