export type LeadStatus = 'Novo' | 'Contatado' | 'Qualificado' | 'Perdido'

export interface Lead {
  id: string
  empresa: string
  contato: string
  email: string
  telefone: string
  segmento: string
  status: LeadStatus
  dataCriacao: string
}

export const mockLeads: Lead[] = [
  {
    id: '1',
    empresa: 'TechCorp Solutions',
    contato: 'Ana Silva',
    email: 'ana.silva@techcorp.com',
    telefone: '(11) 98765-4321',
    segmento: 'Tecnologia',
    status: 'Novo',
    dataCriacao: '2023-10-25',
  },
  {
    id: '2',
    empresa: 'Serviços Globais Ltda',
    contato: 'Carlos Mendes',
    email: 'carlos.m@servicosglobais.com',
    telefone: '(21) 99887-6655',
    segmento: 'Serviços',
    status: 'Qualificado',
    dataCriacao: '2023-10-20',
  },
  {
    id: '3',
    empresa: 'Indústria Metalúrgica',
    contato: 'Roberto Alves',
    email: 'roberto@indmetal.com.br',
    telefone: '(31) 97766-5544',
    segmento: 'Indústria',
    status: 'Contatado',
    dataCriacao: '2023-10-22',
  },
  {
    id: '4',
    empresa: 'Varejo Express',
    contato: 'Mariana Costa',
    email: 'mariana@varejoexpress.com',
    telefone: '(41) 96655-4433',
    segmento: 'Varejo',
    status: 'Perdido',
    dataCriacao: '2023-10-15',
  },
  {
    id: '5',
    empresa: 'InovaTech',
    contato: 'Lucas Pereira',
    email: 'lucas.p@inovatech.io',
    telefone: '(11) 95544-3322',
    segmento: 'Tecnologia',
    status: 'Qualificado',
    dataCriacao: '2023-10-26',
  },
]

export const mockActivities = [
  {
    id: 1,
    title: 'Novo lead cadastrado',
    desc: 'TechCorp Solutions foi adicionado.',
    time: 'Há 2 horas',
    icon: 'user',
  },
  {
    id: 2,
    title: 'Proposta enviada',
    desc: 'Proposta comercial enviada para InovaTech.',
    time: 'Há 4 horas',
    icon: 'file',
  },
  {
    id: 3,
    title: 'Reunião agendada',
    desc: 'Call de alinhamento com Indústria Metalúrgica.',
    time: 'Ontem',
    icon: 'calendar',
  },
  {
    id: 4,
    title: 'Lead qualificado',
    desc: 'Serviços Globais Ltda avançou no funil.',
    time: 'Ontem',
    icon: 'check',
  },
  {
    id: 5,
    title: 'E-mail respondido',
    desc: 'Mariana Costa respondeu ao follow-up.',
    time: 'Há 2 dias',
    icon: 'mail',
  },
]

export const mockPerformanceData = [
  { name: 'Seg', vendas: 4000, leads: 2400 },
  { name: 'Ter', vendas: 3000, leads: 1398 },
  { name: 'Qua', vendas: 2000, leads: 9800 },
  { name: 'Qui', vendas: 2780, leads: 3908 },
  { name: 'Sex', vendas: 1890, leads: 4800 },
  { name: 'Sáb', vendas: 2390, leads: 3800 },
  { name: 'Dom', vendas: 3490, leads: 4300 },
]

export const mockFunnelData = [
  { name: 'Visitantes', value: 5000, fill: 'hsl(var(--chart-1))' },
  { name: 'Leads', value: 2500, fill: 'hsl(var(--chart-2))' },
  { name: 'Qualificados', value: 1000, fill: 'hsl(var(--chart-3))' },
  { name: 'Propostas', value: 400, fill: 'hsl(var(--chart-4))' },
  { name: 'Fechados', value: 150, fill: 'hsl(var(--chart-5))' },
]
