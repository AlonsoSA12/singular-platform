"use client"

import { memo } from "react"
import Link from "next/link"
import type { Product } from "@/lib/mock-data"
import { StatusBadge } from "@/components/status-badge"
import { MiniSparkline } from "@/components/mini-sparkline"
import { ChevronRight } from "lucide-react"

interface ProductCardProps {
  product: Product
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const statusCounts = product.metrics.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const primaryMetric = product.metrics[0]
  const sparklineColor =
    primaryMetric.status === "HOT" ? "#10B981" : primaryMetric.status === "BLEEDING" ? "#FF4D00" : "#6B7280"

  return (
    <Link href={`/product/${product.id}`} className="block touch-manipulation">
      <div className="group relative bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB] transition-all active:scale-[0.98] active:opacity-90">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <h3 className="font-display text-lg font-bold text-[#171717]">{product.name}</h3>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <span>{product.client}</span>
                <span className="text-[#E5E7EB]">•</span>
                <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-xs font-medium">{product.stage}</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#9CA3AF] mt-1 shrink-0" />
          </div>

          {/* Objective */}
          <p className="text-sm text-[#6B7280] leading-relaxed line-clamp-2">{product.objective}</p>

          {/* Sparkline */}
          <div className="h-14 w-full">
            <MiniSparkline data={primaryMetric.data} color={sparklineColor} />
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {statusCounts.HOT && <StatusBadge status="HOT" streak={statusCounts.HOT} />}
            {statusCounts.COLD && <StatusBadge status="COLD" streak={statusCounts.COLD} />}
            {statusCounts.BLEEDING && <StatusBadge status="BLEEDING" streak={statusCounts.BLEEDING} />}
          </div>
        </div>
      </div>
    </Link>
  )
})
