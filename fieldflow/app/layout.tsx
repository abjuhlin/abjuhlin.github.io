import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/providers/ToastProvider'

export const metadata: Metadata = {
  title: {
    default: 'FieldFlow — Field Service Management',
    template: '%s | FieldFlow',
  },
  description:
    'FieldFlow helps HVAC, plumbing, and electrical businesses manage estimates, jobs, invoices, and customer communications — all in one place.',
  keywords: ['field service', 'HVAC', 'plumbing', 'electrical', 'job management', 'invoicing'],
  authors: [{ name: 'FieldFlow' }],
  openGraph: {
    title: 'FieldFlow — Field Service Management',
    description:
      'Manage estimates, jobs, invoices, and customer communications for your field service business.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
