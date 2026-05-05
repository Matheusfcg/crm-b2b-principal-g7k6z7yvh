import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CloudLightning } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      const { error } = await signUp(email, password, { data: { name } })
      setLoading(false)
      if (error) {
        toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Conta criada com sucesso!', description: 'Seja bem-vindo ao CRM B2B.' })
        navigate('/')
      }
    } else {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) {
        toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' })
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-black text-white p-3 rounded-full mb-4">
            <CloudLightning className="h-8 w-8 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CRM B2B</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp ? 'Crie sua conta para começar' : 'Entre com sua conta para continuar'}
          </p>
        </div>
        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                required={isSignUp}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-11"
            disabled={loading}
          >
            {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Crie agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
