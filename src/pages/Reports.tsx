import { useEffect, useState } from 'react'
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  { month: 'Jan', tickets: 45 },
  { month: 'Fev', tickets: 52 },
  { month: 'Mar', tickets: 48 },
  { month: 'Abr', tickets: 61 },
  { month: 'Mai', tickets: 55 },
  { month: 'Jun', tickets: 67 },
]

const pieData = [
  { name: 'Novo', value: 400, color: '#3b82f6' },
  { name: 'Contato', value: 300, color: '#10b981' },
  { name: 'Proposta', value: 300, color: '#0f766e' },
  { name: 'Negociação', value: 200, color: '#f59e0b' },
]

const MOCK_DATA = [
  { name: 'Site', value: 85 },
  { name: 'LinkedIn', value: 62 },
  { name: 'Indicação', value: 45 },
  { name: 'Eventos', value: 30 },
  { name: 'Outros', value: 15 },
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
  const [chartData, setChartData] = useState(MOCK_DATA)

  useEffect(() => {
    async function loadStats() {
      if (!profile) return

      try {
        let leadsQ = supabase.from('leads').select('*', { count: 'exact', head: true })
        let tasksQ = supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente')
        let dataQ = supabase.from('leads').select('origem')

        const role = profile.role?.toLowerCase()
        if (role !== 'admin' && role !== 'gerente') {
          leadsQ = leadsQ.eq('created_by', profile.id)
          tasksQ = tasksQ.eq('user_id', profile.id)
          dataQ = dataQ.eq('created_by', profile.id)
        }

        const [lRes, tRes, dRes] = await Promise.all([leadsQ, tasksQ, dataQ])

        setStats((prev) => ({
          ...prev,
          leads: lRes.count ?? prev.leads,
          tarefas: tRes.count ?? prev.tarefas,
        }))

        if (dRes.data?.length) {
          const counts: Record<string, number> = {}
          dRes.data.forEach((lead) => {
            const o = lead.origem || 'Outros'
            counts[o] = (counts[o] || 0) + 1
          })
          const formatted = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
          if (formatted.length > 0) setChartData(formatted)
        }
      } catch (e) {
        console.error('Erro:', e)
      }
    }
    loadStats()
  }, [profile])

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[#f8fafc] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
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
                  15.2% <TrendingUp className="h-5 w-5 text-slate-900" />
                </h3>
                <p className="text-[13px] text-slate-500 mt-2 flex items-center gap-1">
                  <span className="text-emerald-500 font-medium">+2.4%</span>
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
                  <span className="text-slate-600 font-medium">4 urgentes hoje</span>
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
        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px] lg:col-span-1">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xl font-bold text-slate-900">Origem dos Leads</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Distribuição de aquisição por canal.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[280px] w-full mt-4">
              <ChartContainer config={{ value: { label: 'Leads', color: '#284B5B' } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 13 }}
                      width={90}
                    />
                    <ChartTooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#284B5B" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px] lg:col-span-2">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-[1.1rem]">Relatório Receita</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Visualização da receita mensal nos últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[280px] w-full mt-4">
              <ChartContainer config={{ tickets: { label: 'Receita', color: '#3b82f6' } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTickets2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                      tickFormatter={(v) => `R$${v}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="tickets"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTickets2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px] lg:col-span-1">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-[1.1rem]">Distribuição de Pipeline</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Status atual das oportunidades.
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
