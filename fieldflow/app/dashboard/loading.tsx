import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="w-40 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-56 h-4 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} variant="stat-card" />
        ))}
      </div>
      <LoadingSkeleton variant="card" className="h-44" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton variant="card" className="h-64" />
        <LoadingSkeleton variant="card" className="h-64" />
      </div>
      <LoadingSkeleton variant="card" className="h-24" />
    </div>
  )
}
