"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { mockProducts } from "@/lib/mock-data"
import { BottomNav } from "@/components/bottom-nav"
import type { Product } from "@/lib/mock-data"

function getCategoryReason(product: Product, category: "rose" | "bud" | "thorn"): string {
  const hotCount = product.metrics.filter((m) => m.status === "HOT").length
  const coldCount = product.metrics.filter((m) => m.status === "COLD").length
  const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length
  const avgProgress =
    product.metrics.reduce((sum, m) => {
      const progress = (m.current - m.baseline) / (m.target - m.baseline)
      return sum + (isNaN(progress) ? 0 : progress)
    }, 0) / product.metrics.length

  if (category === "rose") {
    if (hotCount >= 2) {
      return `${hotCount}/3 KRs growing strongly`
    }
    return "Health status: Thriving"
  }

  if (category === "thorn") {
    if (bleedingCount >= 2) {
      return `${bleedingCount}/3 KRs declining, needs intervention`
    }
    return "Health status: Critical"
  }

  // Bud
  if (hotCount === 1) {
    return `1 KR growing, ${coldCount} stagnant - potential to scale`
  }
  if (avgProgress > 0.3 && avgProgress < 0.7) {
    return "Mid-progress with room to accelerate"
  }
  return "Moderate performance, needs focus"
}

export default function InsightsPage() {
  const router = useRouter()
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(true)
  const products = mockProducts

  const classified = useMemo(() => {
    const rose: Product[] = []
    const bud: Product[] = []
    const thorn: Product[] = []

    products.forEach((product) => {
      const hotCount = product.metrics.filter((m) => m.status === "HOT").length
      const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length

      // Rose: Thriving accounts with strong performance
      if (product.healthAnalysis.status === "thriving" || hotCount >= 2) {
        rose.push(product)
      }
      // Thorn: Critical or declining accounts
      else if (product.healthAnalysis.status === "critical" || bleedingCount >= 2) {
        thorn.push(product)
      }
      // Bud: Potential/promising accounts with room to grow
      else {
        bud.push(product)
      }
    })

    return { rose, bud, thorn }
  }, [products])

  // Portfolio-level stats
  const stats = useMemo(() => {
    const totalClients = products.length
    const totalKRs = products.reduce((sum, p) => sum + p.metrics.length, 0)
    const growing = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "HOT").length, 0)
    const stalled = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "COLD").length, 0)
    const declining = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "BLEEDING").length, 0)
    const thriving = products.filter((p) => p.healthAnalysis.status === "thriving").length
    const warning = products.filter((p) => p.healthAnalysis.status === "warning").length
    const critical = products.filter((p) => p.healthAnalysis.status === "critical").length
    const smbs = products.filter((p) => p.clientType === "SMB").length
    const startups = products.filter((p) => p.clientType === "Startup").length

    return { totalClients, totalKRs, growing, stalled, declining, thriving, warning, critical, smbs, startups }
  }, [products])

  useEffect(() => {
    const fetchAIAnalysis = async () => {
      setIsLoadingAI(true)
      try {
        const response = await fetch("/api/portfolio-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stats,
            products: products.map((p) => ({
              name: p.name,
              clientType: p.clientType,
              healthStatus: p.healthAnalysis.status,
              metrics: p.metrics.map((m) => ({
                name: m.name,
                status: m.status,
                progress: Math.round(((m.current - m.baseline) / (m.target - m.baseline)) * 100),
              })),
            })),
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setAiAnalysis(data.analysis)
        }
      } catch (error) {
        console.error("Failed to fetch AI analysis:", error)
      } finally {
        setIsLoadingAI(false)
      }
    }
    fetchAIAnalysis()
  }, [products, stats])

  return (
    <>
      <main className="min-h-screen bg-white pb-28 pt-[calc(env(safe-area-inset-top,47px)+44px)]">
        {/* Header */}
        <div className="bg-white px-5 pt-4 pb-5 border-b border-[#F3F4F6]">
          <h1 className="font-display text-2xl font-bold text-[#171717] mb-1">Portfolio Health</h1>
          <p className="text-sm text-[#6B7280]">
            {classified.rose.length} Roses · {classified.bud.length} Buds · {classified.thorn.length} Thorns
          </p>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* AI Analysis Card */}
          <div className="bg-gradient-to-br from-[#FF4D00]/5 to-[#00D4FF]/5 rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#FF4D00] to-[#00D4FF] flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-display text-sm font-semibold text-[#171717]">AI Portfolio Analysis</span>
            </div>
            {isLoadingAI ? (
              <div className="space-y-2">
                <div className="h-4 bg-[#F3F4F6] rounded animate-pulse w-full" />
                <div className="h-4 bg-[#F3F4F6] rounded animate-pulse w-5/6" />
                <div className="h-4 bg-[#F3F4F6] rounded animate-pulse w-4/6" />
              </div>
            ) : (
              <p className="text-sm text-[#171717] leading-relaxed">{aiAnalysis}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-[#171717]">🌹 Rose</h3>
                <p className="text-xs text-[#6B7280]">Thriving accounts with strong ROI</p>
              </div>
              <span className="text-sm font-bold text-[#10B981]">{classified.rose.length}</span>
            </div>
            <div className="space-y-2">
              {classified.rose.map((product) => (
                <button
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="w-full flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-xl active:scale-[0.98] transition-transform"
                >
                  <div className="h-2 w-2 rounded-full bg-[#10B981] mt-1.5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[#171717] text-sm">{product.name}</div>
                    <div className="text-xs text-[#10B981] mt-0.5">{getCategoryReason(product, "rose")}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#10B981]">
                    {product.metrics.filter((m) => m.status === "HOT").length}/3
                  </div>
                </button>
              ))}
              {classified.rose.length === 0 && (
                <p className="text-sm text-[#9CA3AF] text-center py-4">No thriving accounts yet</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-[#00A3CC]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-[#171717]">🌱 Bud</h3>
                <p className="text-xs text-[#6B7280]">Potential to grow with focus</p>
              </div>
              <span className="text-sm font-bold text-[#00A3CC]">{classified.bud.length}</span>
            </div>
            <div className="space-y-2">
              {classified.bud.map((product) => (
                <button
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="w-full flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-xl active:scale-[0.98] transition-transform"
                >
                  <div className="h-2 w-2 rounded-full bg-[#00A3CC] mt-1.5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[#171717] text-sm">{product.name}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{getCategoryReason(product, "bud")}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#6B7280]">
                    {product.metrics.filter((m) => m.status === "HOT").length}/3
                  </div>
                </button>
              ))}
              {classified.bud.length === 0 && (
                <p className="text-sm text-[#9CA3AF] text-center py-4">No promising accounts</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#FF4D00]/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-[#FF4D00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-[#171717]">🥀 Thorn</h3>
                <p className="text-xs text-[#6B7280]">Needs immediate attention</p>
              </div>
              <span className="text-sm font-bold text-[#FF4D00]">{classified.thorn.length}</span>
            </div>
            <div className="space-y-2">
              {classified.thorn.map((product) => (
                <button
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="w-full flex items-start gap-3 p-3 bg-[#FEF3C7] rounded-xl active:scale-[0.98] transition-transform"
                >
                  <div className="h-2 w-2 rounded-full bg-[#FF4D00] mt-1.5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[#171717] text-sm">{product.name}</div>
                    <div className="text-xs text-[#92400E] mt-0.5">{getCategoryReason(product, "thorn")}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#FF4D00]">
                    {product.metrics.filter((m) => m.status === "BLEEDING").length}/3
                  </div>
                </button>
              ))}
              {classified.thorn.length === 0 && (
                <p className="text-sm text-[#9CA3AF] text-center py-4">No at-risk accounts</p>
              )}
            </div>
          </div>

          <div className="h-6" />
        </div>
      </main>

      <BottomNav />
    </>
  )
}
