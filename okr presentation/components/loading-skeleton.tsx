import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function ProductCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 space-y-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="p-5">
        <Skeleton className="h-48 w-full" />
      </div>
    </Card>
  )
}
