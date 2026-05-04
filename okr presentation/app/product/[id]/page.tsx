"use client"

import { useState } from "react"
import { notFound, useRouter, useParams } from "next/navigation"
import { mockProducts, isMetricStale } from "@/lib/mock-data"
import type { Product } from "@/lib/mock-data"
import { StatusBadge } from "@/components/status-badge"
import { MetricChart } from "@/components/metric-chart"
import { AIVerdict } from "@/components/ai-verdict"
import { KRUpdateForm } from "@/components/kr-update-form"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { HealthAnalysisCard } from "@/components/health-analysis-card"

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const [hoveredMetricId, setHoveredMetricId] = useState<string | null>(null)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [productData, setProductData] = useState<Product | null>(
    () => mockProducts.find((p) => p.id === params.id) || null,
  )

  if (!productData) {
    notFound()
  }

  const product = productData

  const hotCount = product.metrics.filter((m) => m.status === "HOT").length
  const coldCount = product.metrics.filter((m) => m.status === "COLD").length
  const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length

  const overallStatus =
    bleedingCount > 0
      ? "Critical: ROI metrics declining"
      : coldCount >= 2
        ? "Warning: Business outcomes stalled"
        : hotCount >= 2
          ? "Healthy: Strong ROI momentum"
          : "Mixed: Needs strategic focus"

  const handleKRUpdate = (productId: string, updates: { krId: string; newValue: number; note?: string }[]) => {
    setProductData((prev) => {
      if (!prev) return prev
      const updatedMetrics = prev.metrics.map((metric) => {
        const update = updates.find((u) => u.krId === metric.id)
        if (!update) return metric

        // Calculate new status based on progress
        const progress = (update.newValue - metric.baseline) / (metric.target - metric.baseline)
        const newStatus = progress >= 0.5 ? "HOT" : progress > 0 ? "COLD" : "BLEEDING"

        // Determine trend
        const trend =
          update.newValue > metric.current ? "growing" : update.newValue < metric.current ? "declining" : "stagnant"

        return {
          ...metric,
          current: update.newValue,
          status: newStatus,
          trend,
          lastUpdated: "Just now",
          data: [...metric.data.slice(1), { week: `W${metric.data.length + 1}`, value: update.newValue }],
        }
      })
      return { ...prev, metrics: updatedMetrics }
    })
    setShowUpdateForm(false)
  }

  const staleMetrics = product.metrics.filter((m) => isMetricStale(m.lastUpdated, m.lastUpdatedDate))
  const hasStaleMetrics = staleMetrics.length > 0

  if (showUpdateForm) {
    return <KRUpdateForm product={product} onSave={handleKRUpdate} onCancel={() => setShowUpdateForm(false)} />
  }

  return (
    <>
      <main className="min-h-screen bg-white pb-28 pt-[calc(env(safe-area-inset-top,47px)+44px)]">
        <div className="bg-white px-5 pt-5 pb-5 border-b border-[#F3F4F6]">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-[#6B7280] text-sm font-medium mb-4 touch-manipulation active:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <h1 className="font-display text-2xl font-semibold text-[#171717] mb-2">{product.name}</h1>
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <span>{product.client}</span>
            {product.clientType === "Startup" && (
              <>
                <span>•</span>
                <span className="text-[#00A3CC] font-medium">Startup</span>
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-6 space-y-5">
          <HealthAnalysisCard product={product} />

          {hasStaleMetrics && (
            <div className="bg-[#FEF3C7] rounded-2xl p-4 border border-[#FDE68A]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[#F59E0B] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-[#78350F] mb-3">
                    {staleMetrics.length} KR{staleMetrics.length > 1 ? "s" : ""} need updates (7+ days)
                  </p>
                  <button
                    onClick={() => setShowUpdateForm(true)}
                    className="px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-xl active:scale-95 transition-transform"
                  >
                    Log Progress
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#FAFAFA] rounded-2xl p-5">
            <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Objective</div>
            <p className="text-base text-[#171717] leading-relaxed">{product.objective}</p>
          </div>

          {product.metrics.map((metric, index) => {
            const isStale = isMetricStale(metric.lastUpdated, metric.lastUpdatedDate)
            const isDimmed = hoveredMetricId !== null && hoveredMetricId !== metric.id

            return (
              <div
                key={metric.id}
                onMouseEnter={() => setHoveredMetricId(metric.id)}
                onMouseLeave={() => setHoveredMetricId(null)}
                className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 ${
                  isStale ? "border-2 border-[#FDE68A]" : "border border-[#F3F4F6]"
                } ${
                  hoveredMetricId === metric.id
                    ? "scale-[1.02] shadow-lg ring-2 ring-[#00D4FF]/30"
                    : isDimmed
                      ? "opacity-40 blur-[2px] scale-[0.98]"
                      : ""
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#9CA3AF]">KR{index + 1}</span>
                        {isStale && <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#171717]">{metric.name}</h3>
                    </div>
                    <StatusBadge status={metric.status} streak={metric.streak} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">
                        Current
                      </div>
                      <div className="text-xl font-bold text-[#171717] tabular-nums">
                        {metric.unit === "$" && "$"}
                        {metric.current >= 1000000
                          ? `${(metric.current / 1000000).toFixed(1)}M`
                          : metric.current >= 1000
                            ? `${(metric.current / 1000).toFixed(0)}K`
                            : metric.current.toLocaleString()}
                        {metric.unit !== "$" && metric.unit !== "%" && metric.unit !== "score" && (
                          <span className="text-xs ml-0.5 text-[#9CA3AF] font-normal">{metric.unit}</span>
                        )}
                        {metric.unit === "%" && <span className="text-xs ml-0.5 text-[#9CA3AF] font-normal">%</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">
                        Target
                      </div>
                      <div className="text-xl font-bold text-[#171717] tabular-nums">
                        {metric.unit === "$" && "$"}
                        {metric.target >= 1000000
                          ? `${(metric.target / 1000000).toFixed(1)}M`
                          : metric.target >= 1000
                            ? `${(metric.target / 1000).toFixed(0)}K`
                            : metric.target.toLocaleString()}
                        {metric.unit !== "$" && metric.unit !== "%" && metric.unit !== "score" && (
                          <span className="text-xs ml-0.5 text-[#9CA3AF] font-normal">{metric.unit}</span>
                        )}
                        {metric.unit === "%" && <span className="text-xs ml-0.5 text-[#9CA3AF] font-normal">%</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">
                        Progress
                      </div>
                      <div className="text-xl font-bold text-[#171717] tabular-nums">
                        {Math.round(((metric.current - metric.baseline) / (metric.target - metric.baseline)) * 100)}
                        <span className="text-xs ml-0.5 text-[#9CA3AF] font-normal">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-56 w-full bg-[#FAFAFA] rounded-xl p-3">
                    <MetricChart metric={metric} />
                  </div>
                </div>

                <div className="p-5 border-t border-[#F3F4F6] bg-[#FAFAFA]">
                  <AIVerdict metric={metric} />
                </div>
              </div>
            )
          })}

          <div className="h-6" />
        </div>
      </main>

      <BottomNav onUpdateKRs={() => setShowUpdateForm(true)} />
    </>
  )
}
