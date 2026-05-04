"use client"

import type { Product } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Activity, TrendingUp, AlertTriangle, XCircle, Sparkles } from "lucide-react"

interface HealthAnalysisCardProps {
  product: Product
  compact?: boolean
}

export function HealthAnalysisCard({ product, compact = false }: HealthAnalysisCardProps) {
  const { healthAnalysis } = product

  const statusConfig = {
    thriving: {
      icon: TrendingUp,
      label: "Thriving",
      bg: "bg-[#22C55E]/10",
      border: "border-[#22C55E]/30",
      text: "text-[#22C55E]",
      iconBg: "bg-[#22C55E]",
    },
    warning: {
      icon: AlertTriangle,
      label: "Needs Attention",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/30",
      text: "text-[#F59E0B]",
      iconBg: "bg-[#F59E0B]",
    },
    critical: {
      icon: XCircle,
      label: "Critical",
      bg: "bg-[#FF4D00]/10",
      border: "border-[#FF4D00]/30",
      text: "text-[#FF4D00]",
      iconBg: "bg-[#FF4D00]",
    },
  }

  const config = statusConfig[healthAnalysis.status]
  const StatusIcon = config.icon

  if (compact) {
    return (
      <div className={cn("rounded-xl p-3 border", config.bg, config.border)}>
        <div className="flex items-start gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.iconBg)}>
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={cn("h-3 w-3", config.text)} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.text)}>AI Health Check</span>
            </div>
            <p className="text-xs font-semibold text-[#171717] leading-snug line-clamp-2">{healthAnalysis.headline}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl p-5 border", config.bg, config.border)}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg", config.iconBg)}>
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={cn("h-3.5 w-3.5", config.text)} />
            <span className={cn("text-xs font-bold uppercase tracking-wider", config.text)}>AI Health Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", config.text)} />
            <span className={cn("text-sm font-semibold", config.text)}>{config.label}</span>
          </div>
        </div>
      </div>

      {/* Headline */}
      <h3 className="font-display text-lg font-bold text-[#171717] mb-3 leading-tight">"{healthAnalysis.headline}"</h3>

      {/* Full Insight */}
      <p className="text-sm text-[#374151] leading-relaxed">{healthAnalysis.insight}</p>

      {/* Visual Indicator Bar */}
      <div className="mt-4 pt-4 border-t border-[#E5E7EB]/50">
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span>Overall Health</span>
          <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                healthAnalysis.status === "thriving" && "w-[85%] bg-[#22C55E]",
                healthAnalysis.status === "warning" && "w-[55%] bg-[#F59E0B]",
                healthAnalysis.status === "critical" && "w-[25%] bg-[#FF4D00]",
              )}
            />
          </div>
          <span className={cn("font-semibold", config.text)}>
            {healthAnalysis.status === "thriving" && "85%"}
            {healthAnalysis.status === "warning" && "55%"}
            {healthAnalysis.status === "critical" && "25%"}
          </span>
        </div>
      </div>
    </div>
  )
}
