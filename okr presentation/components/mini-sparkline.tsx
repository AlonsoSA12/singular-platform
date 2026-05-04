"use client"

import { memo, useMemo } from "react"
import type { DataPoint } from "@/lib/mock-data"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface MiniSparklineProps {
  data: DataPoint[] | { sprint?: string; date?: string; week?: string; value: number }[]
  color?: string
  trend?: "growing" | "stagnant" | "declining"
  height?: number
  width?: number
}

export const MiniSparkline = memo(function MiniSparkline({ data, color, trend, height, width }: MiniSparklineProps) {
  // Determine color from trend if not provided directly
  const chartColor = useMemo(() => {
    if (color) return color
    if (trend === "growing") return "#10B981"
    if (trend === "declining") return "#FF4D00"
    return "#9CA3AF"
  }, [color, trend])

  const gradientId = useMemo(
    () => `sparkline-${chartColor.replace("#", "")}-${Math.random().toString(36).substr(2, 9)}`,
    [chartColor],
  )

  return (
    <ResponsiveContainer width={width || "100%"} height={height || "100%"}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
})
