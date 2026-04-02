import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    en_route: 'bg-blue-100 text-blue-700',
    viewed: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-amber-100 text-amber-700',
    signed: 'bg-green-100 text-green-700',
    complete: 'bg-green-100 text-green-700',
    paid: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
    void: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
    overdue: 'bg-orange-100 text-orange-700',
    invoiced: 'bg-purple-100 text-purple-700',
    unscheduled: 'bg-yellow-100 text-yellow-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

// Returns 'unscheduled' when a job has status 'scheduled' but no date set yet
export function resolveJobStatus(status: string, scheduledStart: string | null | undefined): string {
  if (status === 'scheduled' && !scheduledStart) return 'unscheduled'
  return status
}
