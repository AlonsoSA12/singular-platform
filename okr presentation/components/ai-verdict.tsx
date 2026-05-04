"use client"

import { useState } from "react"
import type { Metric } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { ThumbsUp, Zap, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AIVerdictProps {
  metric: Metric
}

export function AIVerdict({ metric }: AIVerdictProps) {
  const [verdict, setVerdict] = useState(metric.aiVerdict)
  const [isGenerating, setIsGenerating] = useState(false)

  const isPraise = verdict.type === "praise"

  const regenerateVerdict = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric }),
      })

      if (response.ok) {
        const newVerdict = await response.json()
        setVerdict(newVerdict)
      }
    } catch (error) {
      console.log("[v0] Failed to regenerate verdict")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all",
        isPraise
          ? "bg-gradient-to-br from-hot/10 to-hot/5 border-hot/40 shadow-lg shadow-hot/10"
          : "bg-gradient-to-br from-bleeding/10 to-bleeding/5 border-bleeding/40 shadow-lg shadow-bleeding/10",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-30 pointer-events-none",
          isPraise
            ? "bg-[radial-gradient(circle_at_top_left,hsl(var(--hot)/0.3),transparent_50%)]"
            : "bg-[radial-gradient(circle_at_top_left,hsl(var(--bleeding)/0.3),transparent_50%)]",
        )}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 shadow-lg",
            isPraise
              ? "bg-hot/20 text-hot border-hot/50 shadow-hot/20"
              : "bg-bleeding/20 text-bleeding border-bleeding/50 shadow-bleeding/20",
          )}
        >
          {isPraise ? <ThumbsUp className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className={cn("h-3.5 w-3.5", isPraise ? "text-hot" : "text-bleeding")} />
              <span
                className={cn("text-xs font-bold uppercase tracking-wider", isPraise ? "text-hot" : "text-bleeding")}
              >
                {isPraise ? "AI Praise" : "Devil's Advocate"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerateVerdict}
              disabled={isGenerating}
              className="h-8 px-2.5 text-xs hover:bg-background/50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
            </Button>
          </div>
          <p className="text-sm leading-relaxed font-medium text-foreground">{verdict.message}</p>
        </div>
      </div>
    </div>
  )
}
