import type { MetricStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { TrendingUp, Minus, TrendingDown } from "lucide-react"

interface StatusBadgeProps {
  status: MetricStatus
  streak?: number
  className?: string
}

export function StatusBadge({ status, streak, className }: StatusBadgeProps) {
  const config = {
    HOT: {
      label: "HOT",
      icon: TrendingUp,
      bgColor: "bg-[#10B981]/15",
      textColor: "text-[#10B981]",
      borderColor: "border-[#10B981]/30",
    },
    COLD: {
      label: "COLD",
      icon: Minus,
      bgColor: "bg-[#6B7280]/15",
      textColor: "text-[#6B7280]",
      borderColor: "border-[#6B7280]/30",
    },
    BLEEDING: {
      label: "BLEEDING",
      icon: TrendingDown,
      bgColor: "bg-[#FF4D00]/15",
      textColor: "text-[#FF4D00]",
      borderColor: "border-[#FF4D00]/30",
    },
  }

  const { label, icon: Icon, bgColor, textColor, borderColor } = config[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold",
        bgColor,
        textColor,
        borderColor,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {streak && streak > 1 && <span className="opacity-70">×{streak}</span>}
    </div>
  )
}
