import { AlertTriangle } from "lucide-react"
import { getDaysSinceUpdate } from "@/lib/mock-data"

interface StaleMetricBadgeProps {
  lastUpdated: string
  lastUpdatedDate?: Date
  variant?: "compact" | "full"
}

export function StaleMetricBadge({ lastUpdated, lastUpdatedDate, variant = "full" }: StaleMetricBadgeProps) {
  const daysSince = getDaysSinceUpdate(lastUpdated, lastUpdatedDate)

  if (daysSince < 7) return null

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#FEF3C7] border border-[#FDE68A]">
        <AlertTriangle className="h-3 w-3 text-[#F59E0B]" />
        <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wide">Stale</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
      <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
      <div className="flex-1">
        <div className="text-xs font-bold text-[#D97706] uppercase tracking-wide">No Recent Progress</div>
        <div className="text-[10px] text-[#92400E]">Last updated {daysSince} days ago</div>
      </div>
    </div>
  )
}
