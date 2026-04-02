import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  variant?: 'card' | 'table-row' | 'stat-card' | 'list-item'
  className?: string
  count?: number
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
  )
}

function CardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-5 w-1/3" />
        <SkeletonPulse className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonPulse className="h-4 w-2/3" />
      <SkeletonPulse className="h-4 w-1/2" />
      <div className="flex items-center gap-3 pt-2">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-4 w-24" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <SkeletonPulse className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <SkeletonPulse className="h-4 w-24" />
      </td>
      <td className="px-4 py-3">
        <SkeletonPulse className="h-5 w-16 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonPulse className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <SkeletonPulse className="h-4 w-16" />
      </td>
    </tr>
  )
}

function StatCardSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonPulse className="h-8 w-28" />
      <SkeletonPulse className="h-3 w-32" />
    </div>
  )
}

function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0">
      <SkeletonPulse className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-1/3" />
        <SkeletonPulse className="h-3 w-1/2" />
      </div>
      <SkeletonPulse className="h-5 w-14 rounded-full" />
    </div>
  )
}

export function LoadingSkeleton({
  variant = 'card',
  className,
  count = 3,
}: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count })

  if (variant === 'table-row') {
    return (
      <>
        {skeletons.map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </>
    )
  }

  if (variant === 'stat-card') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {skeletons.map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (variant === 'list-item') {
    return (
      <div className={cn('card divide-y divide-gray-100', className)}>
        {skeletons.map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  // default: 'card'
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {skeletons.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
