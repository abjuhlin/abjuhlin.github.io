import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import nodemailer from 'nodemailer'

type RouteContext = { params: { id: string } }

function getSmtpTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildInvoiceEmailHtml(opts: {
  customerName: string
  companyName: string
  companyPhone: string | null
  companyEmail: string | null
  invoiceNumber: string
  amountDue: number
  dueDate: string | null
  invoiceUrl: string
  brandColor: string
}): string {
  const {
    customerName,
    companyName,
    companyPhone,
    companyEmail,
    invoiceNumber,
    amountDue,
    dueDate,
    invoiceUrl,
    brandColor,
  } = opts

  const firstName = customerName?.split(' ')[0] || 'there'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${brandColor};padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${companyName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#333333;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#333333;">
                A new invoice is ready for your review.
              </p>

              <!-- Invoice summary card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Invoice</td>
                        <td align="right" style="padding:4px 0;font-size:15px;font-weight:600;color:#111827;">${invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Amount Due</td>
                        <td align="right" style="padding:4px 0;font-size:15px;font-weight:600;color:#111827;">${formatCurrency(amountDue)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Due Date</td>
                        <td align="right" style="padding:4px 0;font-size:15px;font-weight:600;color:#111827;">${formatDate(dueDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:${brandColor};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">
                      View Invoice
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;text-align:center;">
                If you have any questions, please contact us${companyPhone ? ` at ${companyPhone}` : ''}${companyEmail ? ` or ${companyEmail}` : ''}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${companyName} &middot; Thank you for your business
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  // Verify SMTP configuration
  const transport = getSmtpTransport()
  const SMTP_FROM = process.env.SMTP_FROM
  if (!transport || !SMTP_FROM) {
    return NextResponse.json(
      {
        error: 'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM environment variables.',
      },
      { status: 503 }
    )
  }

  // Auth check
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fetch invoice with customer data
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      total,
      amount_due,
      due_date,
      sent_at,
      customers (
        full_name,
        phone,
        email
      )
    `)
    .eq('id', params.id)
    .eq('company_id', userData.company_id)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status === 'paid' || invoice.status === 'void') {
    return NextResponse.json(
      { error: `Cannot email an invoice with status "${invoice.status}".` },
      { status: 409 }
    )
  }

  const customer = invoice.customers as any
  if (!customer?.email) {
    return NextResponse.json(
      { error: 'Customer does not have an email address on file.' },
      { status: 422 }
    )
  }

  // Fetch company details for the email
  const { data: company } = await supabase
    .from('companies')
    .select('name, phone, email, primary_color')
    .eq('id', userData.company_id)
    .single()

  const companyName = company?.name || 'FieldFlow'
  const brandColor = company?.primary_color || '#E86C3A'

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
  const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`

  const html = buildInvoiceEmailHtml({
    customerName: customer.full_name || '',
    companyName,
    companyPhone: company?.phone || null,
    companyEmail: company?.email || null,
    invoiceNumber: invoice.invoice_number,
    amountDue: invoice.amount_due ?? invoice.total ?? 0,
    dueDate: invoice.due_date,
    invoiceUrl,
    brandColor,
  })

  const subject = `Invoice ${invoice.invoice_number} from ${companyName} — ${formatCurrency(invoice.amount_due ?? invoice.total ?? 0)}`

  try {
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: customer.email,
      subject,
      html,
    })

    // Update invoice: set sent_at to now, promote draft -> sent
    const updates: Record<string, unknown> = {
      sent_at: new Date().toISOString(),
    }
    if (invoice.status === 'draft') {
      updates.status = 'sent'
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', userData.company_id)
      .select()
      .single()

    if (updateError) {
      console.error('Invoice updated email sent but failed to update record:', updateError)
      // Email was sent successfully, so we still return success but note the DB issue
      return NextResponse.json({
        success: true,
        messageId: info.messageId,
        warning: 'Email sent but failed to update invoice record.',
      })
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      invoice: updatedInvoice,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    console.error('Invoice email send error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
