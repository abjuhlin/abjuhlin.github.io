import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Generates an HTML invoice and returns it as a downloadable HTML file
// (Can be printed to PDF from the browser)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *, customers (full_name, phone, email, address, city, state, zip),
      jobs (title, job_number)
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: company } = await supabase
    .from('companies')
    .select('name, phone, email, logo_url, primary_color')
    .eq('id', userData.company_id)
    .single()

  const customer = invoice.customers as any
  const job = invoice.jobs as any
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : []
  const brandColor = company?.primary_color || '#E86C3A'

  const fmtMoney = (n: number) => `$${Number(n || 0).toFixed(2)}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:14px;padding:40px}
.header{display:flex;justify-content:space-between;margin-bottom:40px}
.company-name{font-size:24px;font-weight:700;color:${brandColor}}
.invoice-label{font-size:28px;font-weight:700;color:#333;text-align:right}
.invoice-num{font-size:14px;color:#666;margin-top:4px;text-align:right}
.meta{display:flex;justify-content:space-between;margin-bottom:30px}
.meta-section h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px}
.meta-section p{font-size:13px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#f5f5f5;text-align:left;padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e5e5e5}
th:last-child{text-align:right}
td{padding:10px 12px;border-bottom:1px solid #eee}
td:last-child{text-align:right;font-weight:500}
.totals{margin-left:auto;width:280px}
.totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#666}
.totals-row.total{border-top:2px solid #333;padding-top:10px;margin-top:6px;font-size:16px;font-weight:700;color:#1a1a1a}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999}
@media print{body{padding:20px}@page{margin:0.5in}}
</style></head><body>
<div class="header">
  <div><div class="company-name">${company?.name || 'Company'}</div>
    ${company?.phone ? `<p style="font-size:13px;color:#666;margin-top:4px">${company.phone}</p>` : ''}
    ${company?.email ? `<p style="font-size:13px;color:#666">${company.email}</p>` : ''}
  </div>
  <div><div class="invoice-label">INVOICE</div>
    <div class="invoice-num">${invoice.invoice_number}</div>
  </div>
</div>
<div class="meta">
  <div class="meta-section"><h3>Bill To</h3>
    <p><strong>${customer?.full_name || ''}</strong></p>
    ${customer?.address ? `<p>${customer.address}</p>` : ''}
    ${customer?.city ? `<p>${[customer.city, customer.state].filter(Boolean).join(', ')} ${customer.zip || ''}</p>` : ''}
    ${customer?.phone ? `<p>${customer.phone}</p>` : ''}
    ${customer?.email ? `<p>${customer.email}</p>` : ''}
  </div>
  <div class="meta-section" style="text-align:right"><h3>Details</h3>
    <p>Date: ${fmtDate(invoice.created_at)}</p>
    ${invoice.due_date ? `<p>Due: ${fmtDate(invoice.due_date)}</p>` : ''}
    ${job ? `<p>Job: ${job.job_number} — ${job.title}</p>` : ''}
    <p>Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>
    ${lineItems.map((li: any) => `<tr>
      <td>${li.description || ''}</td>
      <td>${li.quantity || 0}</td>
      <td>${fmtMoney(li.unit_price)}</td>
      <td>${fmtMoney(li.total)}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(invoice.subtotal)}</span></div>
  ${Number(invoice.tax_rate) > 0 ? `<div class="totals-row"><span>Tax (${invoice.tax_rate}%)</span><span>${fmtMoney(invoice.tax_amount)}</span></div>` : ''}
  <div class="totals-row"><span>Total</span><span>${fmtMoney(invoice.total)}</span></div>
  ${Number(invoice.deposit_applied) > 0 ? `<div class="totals-row"><span>Deposit Applied</span><span>-${fmtMoney(invoice.deposit_applied)}</span></div>` : ''}
  <div class="totals-row total"><span>Amount Due</span><span>${fmtMoney(invoice.amount_due)}</span></div>
</div>
<div class="footer">
  <p>${company?.name || 'FieldFlow'} &middot; Thank you for your business</p>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
