"use client"

import { memo } from "react"
import Link from "next/link"
import cn from "classnames"
import type { Product } from "@/lib/mock-data"
import { isMetricStale } from "@/lib/mock-data"
import { ChevronRight } from "lucide-react"
import { MiniSparkline } from "./mini-sparkline"

interface ClientCardProps {
  product: Product
  isHovered?: boolean
  isDimmed?: boolean
  onHoverStart?: () => void
  onHoverEnd?: void
  category?: "rose" | "bud" | "thorn"
  categoryReason?: string
}

export const ClientCard = memo(function ClientCard({
  product,
  isHovered = false,
  isDimmed = false,
  onHoverStart,
  onHoverEnd,
  category,
  categoryReason,
}: ClientCardProps) {
  const getSparklineColor = (metric: Product["metrics"][0]) => {
    if (isMetricStale(metric.lastUpdated, metric.lastUpdatedDate)) return "#F59E0B"

    const lastTwo = metric.data.slice(-2)
    if (lastTwo.length < 2) return "#9CA3AF"
    const trend = lastTwo[1].value - lastTwo[0].value
    const lowerIsBetter =
      metric.name.toLowerCase().includes("delay") ||
      metric.name.toLowerCase().includes("churn") ||
      metric.name.toLowerCase().includes("overrun") ||
      metric.name.toLowerCase().includes("time") ||
      metric.name.toLowerCase().includes("zero-result")
    const isPositive = lowerIsBetter ? trend <= 0 : trend >= 0
    const isFlat = Math.abs(trend) < 0.1

    if (isFlat) return "#9CA3AF"
    return isPositive ? "#10B981" : "#FF4D00"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "HOT":
        return "bg-[#10B981]"
      case "COLD":
        return "bg-[#9CA3AF]"
      case "BLEEDING":
        return "bg-[#FF4D00]"
      default:
        return "bg-[#9CA3AF]"
    }
  }

  const getCategoryBadge = () => {
    if (!category) return null

    const badges = {
      rose: { icon: "🌹", label: "Rose", color: "bg-green-50 text-green-700 border-green-200" },
      bud: { icon: "🌱", label: "Bud", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      thorn: { icon: "🔴", label: "Thorn", color: "bg-orange-50 text-orange-700 border-orange-200" },
    }

    const badge = badges[category]
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
          badge.color,
        )}
      >
        <span className="text-sm">{badge.icon}</span>
        <span>{badge.label}</span>
      </div>
    )
  }

  const getHealthStatusBadge = () => {
    const status = product.healthAnalysis.status
    const badges = {
      thriving: { label: "Thriving", color: "text-[#10B981]" },
      warning: { label: "Warning", color: "text-[#F59E0B]" },
      critical: { label: "Critical", color: "text-[#FF4D00]" },
    }

    const badge = badges[status]
    return <span className={cn("text-xs font-semibold", badge.color)}>{badge.label}</span>
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="block touch-manipulation"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div
        className={cn(
          "bg-white rounded-2xl p-5 border border-[#F3F4F6]",
          "transition-all duration-300 ease-out",
          "active:scale-[0.99] active:opacity-80",
          isHovered && "scale-[1.02] shadow-lg border-[#00A3CC]/20",
          isDimmed && "opacity-40 blur-[2px] scale-[0.98]",
        )}
      >
        {(category || categoryReason) && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              {getCategoryBadge()}
              {getHealthStatusBadge()}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-[#171717] mb-1">{product.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-[#9CA3AF]">{product.client}</p>
              {product.clientType === "Startup" && (
                <span className="text-[10px] font-semibold text-[#00A3CC] uppercase tracking-wider">Startup</span>
              )}
            </div>
            {categoryReason && <p className="text-xs text-[#6B7280] mt-2 italic">{categoryReason}</p>}
          </div>
          <ChevronRight className="h-5 w-5 text-[#D1D5DB] shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {product.metrics.slice(0, 3).map((metric, idx) => {
            const sparklineColor = getSparklineColor(metric)
            const isStale = isMetricStale(metric.lastUpdated, metric.lastUpdatedDate)

            return (
              <div key={metric.id} className="rounded-xl p-3 bg-[#FAFAFA] relative">
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {isStale && <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(metric.status)}`} />
                </div>

                <div className="text-[10px] font-semibold text-[#9CA3AF] mb-2">KR{idx + 1}</div>

                <div className="text-[10px] text-[#6B7280] leading-tight mb-2 line-clamp-2">{metric.name}</div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-[#171717] tabular-nums">
                    {metric.unit === "$" ? "$" : ""}
                    {metric.current >= 1000
                      ? `${(metric.current / 1000).toFixed(1)}k`
                      : metric.current.toLocaleString()}
                  </span>
                  {metric.unit !== "$" && metric.unit !== "score" && (
                    <span className="text-[10px] text-[#9CA3AF]">{metric.unit}</span>
                  )}
                </div>

                <div className="h-10 w-full -mx-1">
                  <MiniSparkline data={metric.data} color={sparklineColor} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
})
