"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, TrendingUp, TrendingDown, Minus, Sparkles, Loader2, Mic, Send } from "lucide-react"
import type { Product, KeyResult } from "@/lib/mock-data"

const LAST_KR_UPDATE_KEY = "singular_last_kr_update"

interface KRUpdateFormProps {
  product: Product
  onSave: (productId: string, updates: KRUpdate[]) => void
  onCancel: () => void
}

interface KRUpdate {
  krId: string
  newValue: number
  note?: string
}

export function KRUpdateForm({ product, onSave, onCancel }: KRUpdateFormProps) {
  const [updates, setUpdates] = useState<Record<string, { value: string; note: string }>>(
    Object.fromEntries(product.metrics.map((m) => [m.id, { value: m.current.toString(), note: "" }])),
  )
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  const [aiInput, setAiInput] = useState("")
  const [isParsingAI, setIsParsingAI] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const handleUpdateValue = (krId: string, value: string) => {
    setUpdates((prev) => ({ ...prev, [krId]: { ...prev[krId], value } }))
  }

  const handleUpdateNote = (krId: string, note: string) => {
    setUpdates((prev) => ({ ...prev, [krId]: { ...prev[krId], note } }))
  }

  const getChangeIndicator = (kr: KeyResult, newValueStr: string) => {
    const newValue = Number.parseFloat(newValueStr) || 0
    const change = newValue - kr.current
    const percentChange = kr.current > 0 ? ((change / kr.current) * 100).toFixed(1) : 0

    if (change > 0) {
      return { icon: TrendingUp, color: "text-[#10B981]", bgColor: "bg-[#10B981]/10", label: `+${percentChange}%` }
    } else if (change < 0) {
      return { icon: TrendingDown, color: "text-[#FF4D00]", bgColor: "bg-[#FF4D00]/10", label: `${percentChange}%` }
    }
    return { icon: Minus, color: "text-[#9CA3AF]", bgColor: "bg-[#F3F4F6]", label: "No change" }
  }

  const handleAIParse = async () => {
    if (!aiInput.trim()) return
    setIsParsingAI(true)

    try {
      const response = await fetch("/api/parse-kr-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiInput,
          productName: product.name,
          currentMetrics: product.metrics.map((m) => ({
            id: m.id,
            name: m.name,
            current: m.current,
            target: m.target,
            unit: m.unit,
          })),
        }),
      })

      const data = await response.json()

      if (data.updates) {
        // Apply AI-parsed updates
        const newUpdates = { ...updates }
        data.updates.forEach((update: { metricId: string; newValue: number; note?: string }) => {
          if (newUpdates[update.metricId]) {
            newUpdates[update.metricId] = {
              value: update.newValue.toString(),
              note: update.note || newUpdates[update.metricId].note,
            }
          }
        })
        setUpdates(newUpdates)
        setAiInput("")

        // Generate insight automatically after AI parse
        if (data.insight) {
          setAiInsight(data.insight)
        }
      }
    } catch (error) {
      console.error("[v0] AI parse error:", error)
    } finally {
      setIsParsingAI(false)
    }
  }

  const handleGenerateInsight = async () => {
    setIsGeneratingInsight(true)
    try {
      const response = await fetch("/api/generate-verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          metrics: product.metrics.map((m) => ({
            name: m.name,
            current: Number.parseFloat(updates[m.id].value) || m.current,
            previous: m.current,
            target: m.target,
            unit: m.unit,
          })),
        }),
      })
      const data = await response.json()
      setAiInsight(data.verdict || "Keep pushing—momentum is everything.")
    } catch {
      setAiInsight("Data logged. Let's see if the needle moves.")
    } finally {
      setIsGeneratingInsight(false)
    }
  }

  const handleSubmit = () => {
    const krUpdates: KRUpdate[] = product.metrics
      .filter((m) => Number.parseFloat(updates[m.id].value) !== m.current)
      .map((m) => ({
        krId: m.id,
        newValue: Number.parseFloat(updates[m.id].value) || m.current,
        note: updates[m.id].note || undefined,
      }))

    if (krUpdates.length > 0) {
      localStorage.setItem(LAST_KR_UPDATE_KEY, Date.now().toString())
    }

    onSave(product.id, krUpdates)
  }

  const hasChanges = product.metrics.some((m) => Number.parseFloat(updates[m.id].value) !== m.current)

  return (
    <div className="min-h-full bg-[#F9FAFB]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 active:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div className="text-center">
            <h1 className="font-semibold text-base text-gray-900">Log Progress</h1>
            <p className="text-xs text-gray-400 mt-0.5">{product.name}</p>
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="p-5 pb-32 space-y-5">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#00D4FF] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Tell me what changed</h2>
                <p className="text-xs text-gray-400">Describe your progress in plain English</p>
              </div>
            </div>

            <Textarea
              placeholder={`Example: "MRR grew to $48K this week after closing two new enterprise deals. Churn dropped to 2.1% thanks to the new onboarding flow."`}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="min-h-[100px] text-base border-0 bg-gray-50 rounded-2xl resize-none p-4 focus:ring-2 focus:ring-[#00D4FF]/20"
            />

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleAIParse}
                disabled={!aiInput.trim() || isParsingAI}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF4D00] to-[#FF6B2B] text-white font-semibold rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {isParsingAI ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Update with AI
                  </>
                )}
              </button>
              <button className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-500 rounded-2xl active:bg-gray-200 transition-colors">
                <Mic className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="px-5 pb-5 pt-0">
            <div className="flex flex-wrap gap-2">
              {["Revenue up", "New customers", "Churn down", "Costs reduced"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setAiInput((prev) => prev + (prev ? " " : "") + suggestion)}
                  className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 rounded-full border border-gray-100 active:bg-gray-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insight Display */}
        {aiInsight && (
          <div className="bg-gradient-to-br from-[#FF4D00]/5 to-[#00D4FF]/5 rounded-2xl p-4 border border-[#FF4D00]/10">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#00D4FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        )}

        {/* Manual Entry Toggle */}
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="w-full py-3 text-sm font-medium text-gray-400 active:text-gray-600 transition-colors"
        >
          {showManualEntry ? "Hide manual entry" : "Or enter values manually"}
        </button>

        {/* Manual KR Update Cards */}
        {showManualEntry && (
          <div className="space-y-4">
            {product.metrics.map((kr) => {
              const indicator = getChangeIndicator(kr, updates[kr.id].value)
              const Icon = indicator.icon

              return (
                <div key={kr.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* KR Header */}
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{kr.name}</span>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${indicator.bgColor}`}>
                        <Icon className={`h-3.5 w-3.5 ${indicator.color}`} />
                        <span className={`text-xs font-semibold ${indicator.color}`}>{indicator.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        Was: {kr.unit}
                        {kr.current.toLocaleString()}
                      </span>
                      <span>
                        Target: {kr.unit}
                        {kr.target.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Input Section */}
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-12">Now</span>
                      <div className="flex-1 flex items-center gap-2">
                        {kr.unit && <span className="text-xl font-bold text-gray-300">{kr.unit}</span>}
                        <Input
                          type="number"
                          value={updates[kr.id].value}
                          onChange={(e) => handleUpdateValue(kr.id, e.target.value)}
                          className="h-14 text-2xl font-bold text-gray-900 border-0 bg-gray-50 rounded-2xl text-center"
                        />
                      </div>
                    </div>

                    <Input
                      placeholder="What drove this change?"
                      value={updates[kr.id].note}
                      onChange={(e) => handleUpdateNote(kr.id, e.target.value)}
                      className="h-12 text-sm border-0 bg-gray-50 rounded-2xl px-4"
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>
                        {Math.round(
                          ((Number.parseFloat(updates[kr.id].value) - kr.baseline) / (kr.target - kr.baseline)) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF4D00] to-[#00D4FF] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((Number.parseFloat(updates[kr.id].value) - kr.baseline) / (kr.target - kr.baseline)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Current Values Summary (always visible) */}
        {!showManualEntry && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Current Values</h3>
            <div className="space-y-3">
              {product.metrics.map((kr) => {
                const indicator = getChangeIndicator(kr, updates[kr.id].value)
                const Icon = indicator.icon
                const progress = Math.round(
                  ((Number.parseFloat(updates[kr.id].value) - kr.baseline) / (kr.target - kr.baseline)) * 100,
                )

                return (
                  <div key={kr.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${indicator.bgColor}`}>
                        <Icon className={`h-4 w-4 ${indicator.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{kr.name}</p>
                        <p className="text-xs text-gray-400">{progress}% to target</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">
                        {kr.unit}
                        {Number.parseFloat(updates[kr.id].value).toLocaleString()}
                      </p>
                      <p className={`text-xs font-medium ${indicator.color}`}>{indicator.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Generate Insight Button */}
        {hasChanges && !aiInsight && (
          <button
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight}
            className="w-full h-12 flex items-center justify-center gap-2 text-[#FF4D00] font-medium bg-[#FF4D00]/5 rounded-2xl active:bg-[#FF4D00]/10 transition-colors"
          >
            {isGeneratingInsight ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Get AI Analysis
              </>
            )}
          </button>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-gray-100 safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={!hasChanges}
          className="w-full h-14 flex items-center justify-center gap-2 text-base font-semibold rounded-2xl bg-gray-900 text-white disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.98] transition-all"
        >
          {hasChanges ? "Save Progress" : "No changes yet"}
        </button>
      </div>
    </div>
  )
}
