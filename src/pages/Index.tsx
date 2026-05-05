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
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const auth = useAuth() as any
  const user = auth.user || auth.session?.user
  const authProfile = auth.profile

  const [stats, setStats] = useState({
    leads: 0,
    tarefas: 0,
    conversao: 0,
    receita: 0,
  })

  const [areaData, setAreaData] = useState<any[]>([])
  const [barData, setBarData] = useState<any[]>([])

  useEffect(() => {
    async function loadStats() {
      if (!user) return

      try {
        let role = authProfile?.role?.toLowerCase()
        if (!role) {
          const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
          role = data?.role?.toLowerCase()
        }

        let leadsQuery = supabase.from('leads').select('*')
        let tasksQuery = supabase.from('tasks').select('*').neq('status', 'Concluída')
        let proposalsQuery = supabase.from('proposals').select('*, leads(*)')

        if (role !== 'admin' && role !== 'gerente') {
          leadsQuery = leadsQuery.eq('created_by', user.id)
          tasksQuery = tasksQuery.eq('user_id', user.id)
          proposalsQuery = proposalsQuery.eq('user_id', user.id)
        }

        const [leadsRes, tasksRes, proposalsRes] = await Promise.all([
          leadsQuery,
          tasksQuery,
          proposalsQuery,
        ])

        const leads = leadsRes.data || []
        const tasks = tasksRes.data || []
        const proposals = proposalsRes.data || []

        const fechados = leads.filter(
          (l) => l.status === 'Fechado Ganho' || l.status === 'Fechado',
        ).length
        const conversao = leads.length > 0 ? (fechados / leads.length) * 100 : 0

        const wonProposals = proposals.filter(
          (p: any) =>
            p.status === 'Fechado Ganho' ||
            p.status === 'Aceita' ||
            p.leads?.status === 'Fechado Ganho',
        )

        const receita = wonProposals.reduce((acc, p) => acc + (Number(p.valor) || 0), 0)

        setStats({
          leads: leads.length,
          tarefas: tasks.length,
          conversao,
          receita,
        })

        // Pipeline Distribution
        const statusCounts = leads.reduce(
          (acc, l) => {
            const status = l.status || 'Novo'
            acc[status] = (acc[status] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        const newBarData = Object.entries(statusCounts)
          .map(([name, value]) => ({
            name,
            value,
          }))
          .sort((a, b) => b.value - a.value)

        setBarData(newBarData)

        // Monthly Revenue (last 6 months)
        const newAreaData = []
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i)
          const start = startOfMonth(date)
          const end = endOfMonth(date)

          const monthProposals = wonProposals.filter((p: any) => {
            if (!p.created_at) return false
            const pDate = parseISO(p.created_at)
            return pDate >= start && pDate <= end
          })

          const monthRevenue = monthProposals.reduce(
            (acc: number, p: any) => acc + (Number(p.valor) || 0),
            0,
          )

          newAreaData.push({
            month: format(date, 'MMM', { locale: ptBR }),
            receita: monthRevenue,
          })
        }

        setAreaData(newAreaData)
      } catch (e) {
        console.error('Erro ao carregar estatísticas:', e)
      }
    }
    loadStats()
  }, [user, authProfile])

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[#f8fafc] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
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
                  {stats.conversao.toFixed(1)}%
                  <TrendingUp className="h-5 w-5 text-slate-900" />
                </h3>
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
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0,
                  }).format(stats.receita)}
                </h3>
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
            <CardTitle className="text-[1.1rem]">Relatório Receita (Fechado Ganho)</CardTitle>
            <CardDescription className="text-[13px] text-slate-500 mt-1">
              Visualização da receita mensal nos últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[280px] w-full mt-4">
              <ChartContainer
                config={{
                  receita: { label: 'Receita', color: '#3b82f6' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
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
                      tickFormatter={(v) => `R$ ${v > 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReceita)"
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
              <ChartContainer
                config={{
                  value: { label: 'Leads', color: '#10b981' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      width={100}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'][
                              index % 6
                            ]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
