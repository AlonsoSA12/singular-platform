"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { mockProducts } from "@/lib/mock-data"
import { ProductForm } from "@/components/product-form"
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/mock-data"
import { BottomNav } from "@/components/bottom-nav"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line } from "recharts"
import Link from "next/link"
import type { JSX } from "react/jsx-runtime" // Import JSX to fix the undeclared variable error

const ANALYSIS_CACHE_KEY = "singular_portfolio_analysis"
const LAST_KR_UPDATE_KEY = "singular_last_kr_update"
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CachedAnalysis {
  analysis: string
  timestamp: number
  portfolioGrade: number
}

function getCategoryReason(product: Product, category: "rose" | "bud" | "thorn"): string {
  const hotCount = product.metrics.filter((m) => m.status === "HOT").length
  const coldCount = product.metrics.filter((m) => m.status === "COLD").length
  const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length

  if (category === "rose") {
    if (hotCount >= 2) return `${hotCount}/3 KRs growing strongly`
    return "Health status: Thriving"
  }

  if (category === "thorn") {
    if (bleedingCount >= 2) return `${bleedingCount}/3 KRs declining, needs intervention`
    return "Health status: Critical"
  }

  // Bud
  if (hotCount === 1) return `1 KR growing, ${coldCount} stagnant - potential to scale`
  return "Moderate performance, needs focus"
}

function isMetricStale(lastUpdatedDate: string): boolean {
  const daysSinceLastUpdate = Math.floor((Date.now() - new Date(lastUpdatedDate).getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceLastUpdate > 30 // Assuming stale if not updated in 30 days
}

function getAccountGrade(product: Product): number {
  const totalMetrics = product.metrics.length
  const hotCount = product.metrics.filter((m) => m.status === "HOT").length
  const coldCount = product.metrics.filter((m) => m.status === "COLD").length
  const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length
  return Math.round((hotCount * 100 + coldCount * 60 + bleedingCount * 30) / totalMetrics)
}

function formatAnalysisWithLinks(analysis: string, products: Product[]) {
  if (!analysis) return null

  // Create a map of product names to their IDs and data
  const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p]))

  // Function to wrap product names in styled links
  const wrapProductNames = (text: string): (string | JSX.Element)[] => {
    const elements: (string | JSX.Element)[] = []
    let remainingText = text
    let keyIndex = 0

    products.forEach((product) => {
      const regex = new RegExp(`\\b${product.name}\\b`, "gi")
      let lastIndex = 0
      const parts: (string | JSX.Element)[] = []
      let match

      const tempText = remainingText
      remainingText = ""

      while ((match = regex.exec(tempText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(tempText.slice(lastIndex, match.index))
        }

        // Determine color based on product health
        const isRose =
          product.healthAnalysis.status === "thriving" || product.metrics.filter((m) => m.status === "HOT").length >= 2
        const isThorn =
          product.healthAnalysis.status === "critical" ||
          product.metrics.filter((m) => m.status === "BLEEDING").length >= 2
        const linkColor = isRose ? "text-[#10B981]" : isThorn ? "text-[#EF4444]" : "text-[#F59E0B]"

        parts.push(
          <Link
            key={`${product.id}-${keyIndex++}`}
            href={`/product/${product.id}`}
            className={cn("font-semibold hover:underline", linkColor)}
            onClick={(e) => e.stopPropagation()}
          >
            {match[0]}
          </Link>,
        )
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < tempText.length) {
        parts.push(tempText.slice(lastIndex))
      }

      if (parts.length > 0) {
        elements.push(...parts)
      }
    })

    return elements.length > 0 ? elements : [text]
  }

  // Parse analysis into structured sections
  const sentences = analysis.split(/(?<=[.!?])\s+/)

  // Identify key sections
  const gradeSentence = sentences.find((s) => s.includes("grade") || s.includes("%"))
  const winnerPhrases = ["winner", "top performer", "crushing", "firing", "cash cow", "strong", "thriving"]
  const problemPhrases = ["problem", "danger", "bleeding", "critical", "warning", "risk", "concern", "attention"]
  const actionPhrases = ["needs", "focus", "stop", "fix", "should", "must", "priority"]

  const winnerSentences = sentences.filter((s) => winnerPhrases.some((p) => s.toLowerCase().includes(p)))
  const problemSentences = sentences.filter((s) => problemPhrases.some((p) => s.toLowerCase().includes(p)))
  const actionSentences = sentences.filter(
    (s) =>
      actionPhrases.some((p) => s.toLowerCase().includes(p)) &&
      !winnerSentences.includes(s) &&
      !problemSentences.includes(s),
  )
  const otherSentences = sentences.filter(
    (s) =>
      s !== gradeSentence &&
      !winnerSentences.includes(s) &&
      !problemSentences.includes(s) &&
      !actionSentences.includes(s),
  )

  return (
    <div className="space-y-4">
      {/* Grade Summary - prominent */}
      {gradeSentence && (
        <p className="text-[15px] font-medium text-[#171717] leading-relaxed">{wrapProductNames(gradeSentence)}</p>
      )}

      {/* Winners Section */}
      {winnerSentences.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏆</span>
            <span className="text-xs font-semibold text-[#10B981] uppercase tracking-wide">Winners</span>
          </div>
          <ul className="space-y-1 pl-5">
            {winnerSentences.map((sentence, idx) => (
              <li key={idx} className="text-sm text-[#4B5563] leading-relaxed list-disc">
                {wrapProductNames(sentence)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Problem Areas Section */}
      {problemSentences.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">⚠️</span>
            <span className="text-xs font-semibold text-[#EF4444] uppercase tracking-wide">Needs Attention</span>
          </div>
          <ul className="space-y-1 pl-5">
            {problemSentences.map((sentence, idx) => (
              <li key={idx} className="text-sm text-[#4B5563] leading-relaxed list-disc">
                <span className="italic">{wrapProductNames(sentence)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items Section */}
      {actionSentences.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-semibold text-[#FF4D00] uppercase tracking-wide">Focus Areas</span>
          </div>
          <ul className="space-y-1 pl-5">
            {actionSentences.map((sentence, idx) => (
              <li key={idx} className="text-sm text-[#4B5563] leading-relaxed list-disc font-medium">
                {wrapProductNames(sentence)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Other context */}
      {otherSentences.length > 0 && (
        <div className="text-sm text-[#6B7280] leading-relaxed pt-2 border-t border-[#F3F4F6]">
          {otherSentences.map((sentence, idx) => (
            <span key={idx}>{wrapProductNames(sentence)} </span>
          ))}
        </div>
      )}
    </div>
  )
}

const AnalysisContent = ({ analysis, products }: { analysis: string | null; products: Product[] }) => {
  return formatAnalysisWithLinks(analysis || "", products)
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [showGradeChart, setShowGradeChart] = useState(false)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null)
  const [isManualRefresh, setIsManualRefresh] = useState(false)

  const categorizedProducts = useMemo(() => {
    const rose: Product[] = []
    const bud: Product[] = []
    const thorn: Product[] = []

    products.forEach((product) => {
      const hotCount = product.metrics.filter((m) => m.status === "HOT").length
      const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length

      if (product.healthAnalysis.status === "thriving" || hotCount >= 2) {
        rose.push(product)
      } else if (product.healthAnalysis.status === "critical" || bleedingCount >= 2) {
        thorn.push(product)
      } else {
        bud.push(product)
      }
    })

    return { rose, bud, thorn }
  }, [products])

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

  const portfolioGrade = useMemo(() => {
    const totalKRs = products.reduce((sum, p) => sum + p.metrics.length, 0)
    const hotKRs = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "HOT").length, 0)
    const coldKRs = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "COLD").length, 0)
    const bleedingKRs = products.reduce((sum, p) => sum + p.metrics.filter((m) => m.status === "BLEEDING").length, 0)

    // Hot KRs = 100%, Cold = 60%, Bleeding = 30%
    const weightedScore = (hotKRs * 100 + coldKRs * 60 + bleedingKRs * 30) / totalKRs
    return Math.round(weightedScore)
  }, [products])

  const portfolioGradeHistory = useMemo(() => {
    return [
      { sprint: "S1", date: "Sep 16", grade: 68 },
      { sprint: "S2", date: "Sep 30", grade: 71 },
      { sprint: "S3", date: "Oct 14", grade: 74 },
      { sprint: "S4", date: "Oct 28", grade: 76 },
      { sprint: "S5", date: "Nov 11", grade: 77 },
      { sprint: "S6", date: "Nov 25", grade: portfolioGrade },
    ]
  }, [portfolioGrade])

  const gradeChange = useMemo(() => {
    const previousGrade = portfolioGradeHistory[portfolioGradeHistory.length - 2]?.grade || portfolioGrade
    return portfolioGrade - previousGrade
  }, [portfolioGrade, portfolioGradeHistory])

  const getGradeColor = (grade: number) => {
    if (grade >= 80)
      return {
        bg: "from-[#10B981] to-[#059669]",
        text: "text-[#10B981]",
        light: "from-[#10B981]/10 to-[#059669]/10",
        border: "border-[#10B981]/20",
        hex: "#10B981",
      }
    if (grade >= 65)
      return {
        bg: "from-[#F59E0B] to-[#D97706]",
        text: "text-[#F59E0B]",
        light: "from-[#F59E0B]/10 to-[#D97706]/10",
        border: "border-[#F59E0B]/20",
        hex: "#F59E0B",
      }
    return {
      bg: "from-[#EF4444] to-[#DC2626]",
      text: "text-[#EF4444]",
      light: "from-[#EF4444]/10 to-[#DC2626]/10",
      border: "border-[#EF4444]/20",
      hex: "#EF4444",
    }
  }

  const gradeColors = getGradeColor(portfolioGrade)

  const generateFallbackAnalysis = useCallback(() => {
    const roseClients = categorizedProducts.rose.map((p) => p.name).join(", ")
    const thornClients = categorizedProducts.thorn.map((p) => p.name).join(", ")
    const thornCount = categorizedProducts.thorn.length

    let analysis = `Claudia's portfolio sits at a ${portfolioGrade}% grade with ${stats.growing} KRs growing and ${stats.declining} declining. `

    if (categorizedProducts.rose.length > 0) {
      analysis += `Top performers include ${roseClients}, driving strong business outcomes. `
    }

    if (thornCount > 0) {
      analysis += `${thornCount} account${thornCount > 1 ? "s" : ""} in danger: ${thornClients}. These need immediate attention to stop the bleeding. `
    }

    analysis += `Focus on converting ${categorizedProducts.bud.length} bud accounts to roses while stabilizing the thorns.`

    return analysis
  }, [categorizedProducts, portfolioGrade, stats])

  const shouldRefreshAnalysis = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(ANALYSIS_CACHE_KEY)
      const lastKRUpdate = localStorage.getItem(LAST_KR_UPDATE_KEY)

      if (!cachedData) return true

      const cached: CachedAnalysis = JSON.parse(cachedData)
      const now = Date.now()

      // Check if cache is older than 24 hours
      if (now - cached.timestamp > CACHE_DURATION_MS) {
        return true
      }

      // No automatic timer-based refresh
      if (lastKRUpdate) {
        const lastUpdate = Number.parseInt(lastKRUpdate, 10)

        // Only refresh if update was after last analysis (no time buffer)
        if (lastUpdate > cached.timestamp) {
          return true
        }
      }

      return false
    } catch {
      return true
    }
  }, [])

  useEffect(() => {
    const loadAnalysis = async () => {
      // Try to load from cache first
      try {
        const cachedData = localStorage.getItem(ANALYSIS_CACHE_KEY)
        if (cachedData && !isManualRefresh) {
          const cached: CachedAnalysis = JSON.parse(cachedData)

          // Use cache if still valid
          if (!shouldRefreshAnalysis()) {
            setAiAnalysis(cached.analysis)
            setLastAnalysisTime(cached.timestamp)
            setIsLoadingAI(false)
            return
          }
        }
      } catch {
        // Continue to fetch if cache read fails
      }

      // Fetch new analysis
      setIsLoadingAI(true)
      try {
        const response = await fetch("/api/portfolio-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stats,
            portfolioGrade,
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
          const analysisText = data.analysis || generateFallbackAnalysis()

          // Save to cache
          const cacheData: CachedAnalysis = {
            analysis: analysisText,
            timestamp: Date.now(),
            portfolioGrade,
          }
          localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cacheData))

          setAiAnalysis(analysisText)
          setLastAnalysisTime(cacheData.timestamp)
        } else {
          const fallback = generateFallbackAnalysis()
          setAiAnalysis(fallback)
        }
      } catch (error) {
        console.error("Failed to fetch AI analysis:", error)
        setAiAnalysis(generateFallbackAnalysis())
      } finally {
        setIsLoadingAI(false)
        setIsManualRefresh(false)
      }
    }

    loadAnalysis()
  }, [products, stats, portfolioGrade, generateFallbackAnalysis, shouldRefreshAnalysis, isManualRefresh])

  const handleRefreshAnalysis = async () => {
    setIsManualRefresh(true)
    setIsLoadingAI(true)
    // Clear cache to force refresh
    localStorage.removeItem(ANALYSIS_CACHE_KEY)
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveProduct = (product: Product) => {
    const existingIndex = products.findIndex((p) => p.id === product.id)
    if (existingIndex >= 0) {
      const updated = [...products]
      updated[existingIndex] = product
      setProducts(updated)
    } else {
      setProducts([...products, product])
    }
    setShowForm(false)
  }

  const portfolioGradeWithForecast = useMemo(() => {
    const historical = portfolioGradeHistory.map((item) => ({ ...item, type: "actual" }))

    const lastActual = historical[historical.length - 1]

    const bleedingClients = products.filter((p) => p.metrics.filter((m) => m.status === "BLEEDING").length >= 2)
    const staleClients = products.filter((p) => p.metrics.some((m) => isMetricStale(m.lastUpdatedDate)))
    const growingClients = products.filter((p) => p.metrics.filter((m) => m.status === "HOT").length >= 2)

    // Optimistic: accelerate growth by 3 points per sprint
    const optimisticGrowth = [3, 6, 9]

    // Pessimistic: decline by 3-4 points per sprint
    const pessimisticDecline = [3, 7, 11]

    // Build combined dataset with all historical points having null forecast values
    // Then the last historical point has the actual grade AND both forecast starting values
    // Then forecast-only points
    const combined = [
      ...historical.slice(0, -1).map((h) => ({
        ...h,
        optimistic: null,
        pessimistic: null,
      })),
      // Last actual point - this is where forecast lines start from
      {
        ...lastActual,
        optimistic: lastActual.grade,
        pessimistic: lastActual.grade,
      },
      // Future forecast points
      {
        sprint: "S7",
        date: "Dec 9",
        grade: null,
        optimistic: Math.min(100, portfolioGrade + optimisticGrowth[0]),
        pessimistic: Math.max(20, portfolioGrade - pessimisticDecline[0]),
        type: "forecast",
      },
      {
        sprint: "S8",
        date: "Dec 23",
        grade: null,
        optimistic: Math.min(100, portfolioGrade + optimisticGrowth[1]),
        pessimistic: Math.max(20, portfolioGrade - pessimisticDecline[1]),
        type: "forecast",
      },
      {
        sprint: "S9",
        date: "Jan 6",
        grade: null,
        optimistic: Math.min(100, portfolioGrade + optimisticGrowth[2]),
        pessimistic: Math.max(20, portfolioGrade - pessimisticDecline[2]),
        type: "forecast",
      },
    ]

    const optimisticJustification = (() => {
      const drivers = []

      // Find biggest opportunities from bleeding accounts
      if (bleedingClients.length > 0) {
        const client = bleedingClients[0]
        const bleedingKR = client.metrics.find((m) => m.status === "BLEEDING")
        if (bleedingKR) {
          const potentialGain = Math.round(((bleedingKR.target - bleedingKR.current) / bleedingKR.target) * 100)
          drivers.push(
            `${client.name} recovers ${bleedingKR.name} from ${bleedingKR.current}${bleedingKR.unit} to ${bleedingKR.target}${bleedingKR.unit} (${potentialGain}% gain)`,
          )
        }
      }

      // Find stale accounts with highest upside
      const highValueStale = staleClients.filter((c) => c.clientType === "SMB").slice(0, 1)
      if (highValueStale.length > 0) {
        const client = highValueStale[0]
        const staleKR = client.metrics.find((m) => isMetricStale(m.lastUpdatedDate))
        if (staleKR) {
          drivers.push(`${client.name} breaks stale period and activates ${staleKR.name} growth initiatives`)
        }
      }

      // Accelerate existing winners
      if (growingClients.length > 0) {
        const client = growingClients[0]
        const hotKR = client.metrics.find((m) => m.status === "HOT")
        if (hotKR) {
          drivers.push(`${client.name} accelerates ${hotKR.name} by 20% through increased investment`)
        }
      }

      return drivers.length > 0 ? drivers.join("; ") : "All declining KRs stabilize and stagnant accounts activate"
    })()

    const pessimisticJustification = (() => {
      const risks = []

      // Identify highest-risk bleeding accounts
      if (bleedingClients.length > 0) {
        const client = bleedingClients[0]
        const bleedingKRs = client.metrics.filter((m) => m.status === "BLEEDING")
        if (bleedingKRs.length > 0) {
          risks.push(`${client.name}'s ${bleedingKRs[0].name} continues declining 15% per sprint without intervention`)
        }
      }

      // Quantify stale account risk
      if (staleClients.length >= 2) {
        const staleKRCount = staleClients.reduce(
          (sum, c) => sum + c.metrics.filter((m) => isMetricStale(m.lastUpdatedDate)).length,
          0,
        )
        risks.push(
          `${staleKRCount} stale KRs across ${staleClients.length} accounts remain unaddressed, preventing any upside`,
        )
      }

      // Critical health status impact
      const criticalClients = products.filter((p) => p.healthAnalysis.status === "critical")
      if (criticalClients.length > 0) {
        const criticalKRs = criticalClients[0].metrics.filter((m) => m.status === "BLEEDING")
        risks.push(`${criticalClients[0].name} continues bleeding on ${criticalKRs.length} KRs with no recovery plan`)
      }

      return risks.length > 0 ? risks.join("; ") : "Critical accounts deteriorate without immediate action"
    })()

    const allValues = combined
      .flatMap((d) => [d.grade, d.optimistic, d.pessimistic])
      .filter((v): v is number => v !== null && v !== undefined)
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const padding = 10 // Add 10 points padding
    const yMin = Math.max(0, Math.floor((minValue - padding) / 5) * 5) // Round down to nearest 5
    const yMax = Math.min(100, Math.ceil((maxValue + padding) / 5) * 5) // Round up to nearest 5
    const yTicks = Array.from({ length: Math.ceil((yMax - yMin) / 10) + 1 }, (_, i) => yMin + i * 10)

    return {
      combined,
      optimisticJustification,
      pessimisticJustification,
      yDomain: [yMin, yMax] as [number, number],
      yTicks,
    }
  }, [products, portfolioGrade, portfolioGradeHistory])

  if (showForm) {
    return <ProductForm onSave={handleSaveProduct} onCancel={() => setShowForm(false)} />
  }

  return (
    <>
      <main className="min-h-screen bg-white pb-28 pt-[calc(env(safe-area-inset-top,47px)+44px)]">
        {/* Header */}
        <div className="bg-white px-5 pt-6 pb-6 border-b border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-6">
            <img src="/images/singular-20logo-20white-20background.png" alt="Singular" className="h-7 object-contain" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-full bg-[#F9FAFB] flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
            >
              <RefreshCw className={cn("h-4 w-4 text-[#6B7280]", isRefreshing && "animate-spin")} />
            </button>
          </div>

          <h1 className="font-display text-xl font-semibold text-[#171717] mb-0.5">Claudia Galdamez</h1>
          <p className="text-sm text-[#9CA3AF]">Product Owner · Business ROI Tracker</p>
        </div>

        <div className="px-5 pt-5">
          {/* Portfolio Grade */}
          <button
            onClick={() => setShowGradeChart(!showGradeChart)}
            className={cn(
              "w-full bg-gradient-to-br rounded-2xl p-5 mb-5 border touch-manipulation active:scale-[0.98] transition-all",
              gradeColors.light,
              gradeColors.border,
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                    gradeColors.bg,
                  )}
                >
                  <span className="text-2xl font-display font-bold text-white">{portfolioGrade}</span>
                </div>
                <div className="text-left">
                  <h3 className="font-display text-lg font-semibold text-[#171717]">Portfolio Grade</h3>
                  <div className="flex items-center gap-2">
                    {gradeChange > 0 ? (
                      <>
                        <TrendingUp className={cn("h-4 w-4", gradeColors.text)} />
                        <span className={cn("text-sm font-semibold", gradeColors.text)}>+{gradeChange}%</span>
                      </>
                    ) : gradeChange < 0 ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-[#EF4444]" />
                        <span className="text-sm font-semibold text-[#EF4444]">{gradeChange}%</span>
                      </>
                    ) : (
                      <span className="text-sm text-[#6B7280]">No change</span>
                    )}
                    <span className="text-xs text-[#9CA3AF]">vs last sprint</span>
                  </div>
                </div>
              </div>
              {showGradeChart ? (
                <ChevronUp className="h-5 w-5 text-[#6B7280]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#6B7280]" />
              )}
            </div>
          </button>

          {/* Portfolio Health Trend Chart */}
          {showGradeChart && (
            <div className="bg-white rounded-2xl p-5 mb-5 border border-[#F3F4F6] overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#171717]">Portfolio Health Trend</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">6 sprint historical + 3 sprint forecast</p>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-display font-bold", gradeColors.text)}>{portfolioGrade}</div>
                  <div className="text-xs text-[#9CA3AF]">Current</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={portfolioGradeWithForecast.combined}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={gradeColors.hex} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={gradeColors.hex} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    axisLine={{ stroke: "#F3F4F6" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={portfolioGradeWithForecast.yDomain}
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    axisLine={{ stroke: "#F3F4F6" }}
                    tickLine={false}
                    ticks={portfolioGradeWithForecast.yTicks}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #F3F4F6",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelStyle={{ color: "#171717", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}
                    itemStyle={{ color: "#6B7280", fontSize: "12px", padding: 0 }}
                    formatter={(value: number, name: string) => {
                      if (!value) return null
                      if (name === "optimistic") return [`${Math.round(value)}%`, "Optimistic"]
                      if (name === "pessimistic") return [`${Math.round(value)}%`, "Pessimistic"]
                      return [`${Math.round(value)}%`, "Actual"]
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `${payload[0].payload.sprint} · ${label}`
                      }
                      return label
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="grade"
                    stroke={gradeColors.hex}
                    strokeWidth={3}
                    fill="url(#gradeAreaGradient)"
                    animationDuration={800}
                    dot={{
                      r: 5,
                      fill: "white",
                      stroke: gradeColors.hex,
                      strokeWidth: 3,
                    }}
                    activeDot={{
                      r: 7,
                      fill: gradeColors.hex,
                      stroke: "white",
                      strokeWidth: 3,
                    }}
                    connectNulls={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#10B981"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ r: 5, fill: "white", stroke: "#10B981", strokeWidth: 2.5 }}
                    activeDot={{ r: 7, fill: "#10B981", stroke: "white", strokeWidth: 3 }}
                    connectNulls={true}
                  />

                  <Line
                    type="monotone"
                    dataKey="pessimistic"
                    stroke="#EF4444"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ r: 5, fill: "white", stroke: "#EF4444", strokeWidth: 2.5 }}
                    activeDot={{ r: 7, fill: "#EF4444", stroke: "white", strokeWidth: 3 }}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-4 pt-4 border-t border-[#F3F4F6] space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <div className={cn("h-2 w-2 rounded-full", gradeColors.bg)} />
                    <span className="text-xs font-medium text-[#171717]">Actual</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">
                    Historical performance: {portfolioGradeHistory[0].grade} → {portfolioGrade} (+
                    {portfolioGrade - portfolioGradeHistory[0].grade} points over 6 sprints)
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <div
                      className="h-0.5 w-4 bg-[#10B981] rounded"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, #10B981 0, #10B981 6px, transparent 6px, transparent 10px)",
                      }}
                    />
                    <span className="text-xs font-medium text-[#10B981]">Optimistic</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">{portfolioGradeWithForecast.optimisticJustification}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <div
                      className="h-0.5 w-4 bg-[#EF4444] rounded"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, #EF4444 0, #EF4444 6px, transparent 6px, transparent 10px)",
                      }}
                    />
                    <span className="text-xs font-medium text-[#EF4444]">Pessimistic</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">{portfolioGradeWithForecast.pessimisticJustification}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="bg-white rounded-2xl p-5 mb-5 border border-[#F3F4F6]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#FF4D00] to-[#00D4FF] flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-[#171717]">Portfolio Analysis</h3>
                  {lastAnalysisTime && (
                    <p className="text-xs text-[#9CA3AF]">
                      Updated {new Date(lastAnalysisTime).toLocaleDateString()} at{" "}
                      {new Date(lastAnalysisTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefreshAnalysis}
                disabled={isLoadingAI}
                className="h-9 px-3 rounded-xl bg-[#F9FAFB] flex items-center gap-2 text-sm font-medium text-[#6B7280] touch-manipulation active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoadingAI && "animate-spin")} />
                {isLoadingAI ? "Analyzing..." : "Refresh"}
              </button>
            </div>

            {isLoadingAI ? (
              <div className="flex items-center gap-3 py-4">
                <div className="h-5 w-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#6B7280]">Analyzing portfolio performance...</span>
              </div>
            ) : (
              <AnalysisContent analysis={aiAnalysis} products={products} />
            )}

            {lastAnalysisTime && !isLoadingAI && (
              <p className="text-xs text-[#9CA3AF] mt-4 pt-3 border-t border-[#F3F4F6]">
                Auto-refreshes daily or after you log new progress
              </p>
            )}
          </div>

          {/* Quick Account Summary */}
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-[#171717] mb-3">Account Summary</h2>
            <div className="space-y-2">
              {products.map((product) => {
                const grade = getAccountGrade(product)
                const category = categorizedProducts.rose.includes(product)
                  ? "rose"
                  : categorizedProducts.thorn.includes(product)
                    ? "thorn"
                    : "bud"
                const categoryEmoji = category === "rose" ? "🌹" : category === "thorn" ? "🥀" : "🌱"
                const gradeColor =
                  grade >= 80
                    ? "text-[#10B981] bg-[#10B981]"
                    : grade >= 65
                      ? "text-[#F59E0B] bg-[#F59E0B]"
                      : "text-[#EF4444] bg-[#EF4444]"
                const hotCount = product.metrics.filter((m) => m.status === "HOT").length
                const coldCount = product.metrics.filter((m) => m.status === "COLD").length
                const bleedingCount = product.metrics.filter((m) => m.status === "BLEEDING").length

                return (
                  <button
                    key={product.id}
                    onClick={() => router.push(`/product/${product.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl touch-manipulation active:scale-[0.98] transition-all text-left"
                  >
                    <span className="text-lg">{categoryEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#171717] truncate">{product.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]">
                          {product.clientType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#10B981]">{hotCount} hot</span>
                        <span className="text-xs text-[#6B7280]">{coldCount} flat</span>
                        {bleedingCount > 0 && <span className="text-xs text-[#EF4444]">{bleedingCount} bleeding</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center",
                          grade >= 80 ? "bg-[#10B981]/10" : grade >= 65 ? "bg-[#F59E0B]/10" : "bg-[#EF4444]/10",
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            grade >= 80 ? "text-[#10B981]" : grade >= 65 ? "text-[#F59E0B]" : "text-[#EF4444]",
                          )}
                        >
                          {grade}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <BottomNav currentPath="/" onAddClient={() => setShowForm(true)} />
    </>
  )
}
