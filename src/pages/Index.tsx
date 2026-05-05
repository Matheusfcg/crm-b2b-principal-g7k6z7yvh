import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const MOCK_DATA = [
  { name: 'Site', value: 85 },
  { name: 'LinkedIn', value: 62 },
  { name: 'Indicação', value: 45 },
  { name: 'Eventos', value: 30 },
  { name: 'Outros', value: 15 },
]

export default function Index() {
  const { profile } = useAuth()
  const [chartData, setChartData] = useState(MOCK_DATA)

  useEffect(() => {
    async function loadStats() {
      if (!profile) return

      try {
        let query = supabase.from('leads').select('origem')

        const role = profile.role?.toLowerCase()
        if (role !== 'admin' && role !== 'gerente') {
          query = query.eq('created_by', profile.id)
        }

        const { data } = await query

        if (data && data.length > 0) {
          const counts: Record<string, number> = {}
          data.forEach((lead) => {
            const o = lead.origem || 'Outros'
            counts[o] = (counts[o] || 0) + 1
          })

          const formatted = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

          if (formatted.length > 0) {
            setChartData(formatted)
          }
        }
      } catch (e) {
        console.error('Erro ao carregar origens dos leads:', e)
      }
    }
    loadStats()
  }, [profile])

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[#f8fafc] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-[20px] col-span-1 md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xl font-bold text-slate-900">Origem dos Leads</CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-1">
              Distribuição de aquisição por canal.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-[320px] w-full mt-6">
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
                    <Bar dataKey="value" fill="#284B5B" radius={[0, 4, 4, 0]} barSize={32} />
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
