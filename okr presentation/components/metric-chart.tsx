"use client"

import { memo, useMemo } from "react"
import type { Metric } from "@/lib/mock-data"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, Area, AreaChart } from "recharts"

interface MetricChartProps {
  metric: Metric
}

export const MetricChart = memo(function MetricChart({ metric }: MetricChartProps) {
  const getChartColors = () => {
    switch (metric.status) {
      case "HOT":
        return { stroke: "#10B981", fill: "#10B981" }
      case "COLD":
        return { stroke: "#6B7280", fill: "#6B7280" }
      case "BLEEDING":
        return { stroke: "#FF4D00", fill: "#FF4D00" }
    }
  }

  const colors = getChartColors()

  const enhancedData = useMemo(() => {
    return metric.data.map((point, index) => ({
      ...point,
      label: `${point.sprint}\n${point.date}`,
      isRecent: index >= metric.data.length - 3,
    }))
  }, [metric.data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const value = payload[0].value
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-lg px-3 py-2">
        <div className="text-xs text-[#6B7280] mb-0.5">
          {data.sprint} · {data.date}
        </div>
        <div className="text-sm font-bold text-[#171717]">
          {metric.unit === "$" && "$"}
          {value.toLocaleString()}
          {metric.unit !== "$" && <span className="text-xs ml-1 text-[#6B7280] font-normal">{metric.unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={enhancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} stopOpacity={0.3} />
            <stop offset="100%" stopColor={colors.fill} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          stroke="#E5E7EB"
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
          tick={{ fill: "#9CA3AF" }}
          dy={8}
        />
        <YAxis
          stroke="#E5E7EB"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          width={45}
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
            return value.toString()
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={metric.baseline} stroke="#9CA3AF" strokeDasharray="4 4" strokeWidth={1} />
        <ReferenceLine y={metric.target} stroke="#00D4FF" strokeDasharray="6 3" strokeWidth={2} />
        <ReferenceLine y={metric.benchmark} stroke="#FF4D00" strokeDasharray="4 4" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.stroke}
          strokeWidth={2.5}
          fill={`url(#gradient-${metric.id})`}
          dot={false}
          activeDot={{
            r: 5,
            fill: colors.stroke,
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
})
