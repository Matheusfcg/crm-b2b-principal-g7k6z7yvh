import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WhatsappConfig } from '@/services/whatsapp-meta'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConfig: WhatsappConfig | null
  onSave: (data: {
    phone_number_id: string
    waba_id: string
    access_token: string
  }) => Promise<void>
  saving: boolean
}

export function ManualConfigDialog({ open, onOpenChange, initialConfig, onSave, saving }: Props) {
  const [formData, setFormData] = useState({
    phone_number_id: '',
    waba_id: '',
    access_token: '',
  })

  useEffect(() => {
    if (initialConfig && open) {
      setFormData({
        phone_number_id: initialConfig.phone_number_id,
        waba_id: initialConfig.waba_id,
        access_token: initialConfig.access_token,
      })
    } else if (!open) {
      setFormData({ phone_number_id: '', waba_id: '', access_token: '' })
    }
  }, [initialConfig, open])

  const handleSave = async () => {
    if (!formData.phone_number_id || !formData.waba_id || !formData.access_token) return
    await onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Meta Cloud API</DialogTitle>
          <DialogDescription>
            Insira suas credenciais da Meta Cloud API manualmente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number_id">Phone Number ID</Label>
            <Input
              id="phone_number_id"
              placeholder="106540000000000"
              value={formData.phone_number_id}
              onChange={(e) => setFormData((p) => ({ ...p, phone_number_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
            <Input
              id="waba_id"
              placeholder="100000000000000"
              value={formData.waba_id}
              onChange={(e) => setFormData((p) => ({ ...p, waba_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token</Label>
            <Input
              id="access_token"
              placeholder="EAA..."
              value={formData.access_token}
              onChange={(e) => setFormData((p) => ({ ...p, access_token: e.target.value }))}
            />
          </div>
          <div className="p-4 bg-slate-50 border rounded-md">
            <Label>Webhook URL</Label>
            <Input
              readOnly
              value="https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-meta"
              className="bg-white mt-1 font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving || !formData.phone_number_id || !formData.waba_id || !formData.access_token
            }
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
