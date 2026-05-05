import { ProposalRow } from '@/services/proposals'

export const generateProposalPDF = (proposal: ProposalRow) => {
  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A')

  const win = window.open('', '_blank')
  if (!win) return

  const itemsHtml =
    proposal.itens
      ?.map(
        (item) => `
    <tr>
      <td>${item.nome}</td>
      <td style="text-align: center">${item.quantidade}</td>
      <td style="text-align: right">${formatMoney(item.valor_unitario)}</td>
      <td style="text-align: right">${formatMoney(item.quantidade * item.valor_unitario)}</td>
    </tr>
  `,
      )
      .join('') || ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Proposta - ${proposal.titulo}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 28px; font-weight: bold; color: #1e3a8a; margin: 0; }
        .subtitle { font-size: 14px; color: #64748b; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; }
        .info-item strong { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; }
        .info-item span { font-size: 16px; color: #0f172a; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        .description { margin-bottom: 30px; font-size: 14px; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 12px; }
        .total-row td { font-weight: bold; font-size: 16px; color: #0f172a; border-top: 2px solid #cbd5e1; }
        .observations { font-size: 13px; color: #475569; background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; }
        .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">Proposta Comercial</h1>
          <div class="subtitle">Ref: ${proposal.titulo}</div>
        </div>
        <div style="text-align: right">
          <div style="font-weight: bold; font-size: 20px;">CRM Enterprise</div>
          <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <strong>Para (Cliente)</strong>
          <span>${proposal.lead?.empresa || 'N/A'}<br/>A/C: ${proposal.lead?.contato || 'N/A'}</span>
        </div>
        <div class="info-item">
          <strong>Validade da Proposta</strong>
          <span>${formatDate(proposal.validade)}</span>
        </div>
      </div>

      ${
        proposal.descricao
          ? `
        <div class="section-title">Descrição do Escopo</div>
        <div class="description">${proposal.descricao}</div>
      `
          : ''
      }

      <div class="section-title">Investimento</div>
      <table>
        <thead>
          <tr>
            <th>Item / Serviço</th>
            <th style="text-align: center">Qtd</th>
            <th style="text-align: right">V. Unitário</th>
            <th style="text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="3" style="text-align: right">VALOR TOTAL:</td>
            <td style="text-align: right; color: #2563eb;">${formatMoney(proposal.valor)}</td>
          </tr>
        </tbody>
      </table>

      ${
        proposal.observacoes
          ? `
        <div class="section-title">Observações Importantes</div>
        <div class="observations">${proposal.observacoes.replace(/\n/g, '<br/>')}</div>
      `
          : ''
      }

      <div class="footer">
        Este documento é uma proposta comercial e está sujeito a aprovação.<br/>
        Gerado via CRM Enterprise
      </div>
    </body>
    </html>
  `
  win.document.write(html)
  win.document.close()

  setTimeout(() => {
    win.print()
  }, 500)
}
