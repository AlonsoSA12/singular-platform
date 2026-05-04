"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  X,
  Sparkles,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Building2,
  Rocket,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import type { Product, Metric, ProductStage, ClientType } from "@/lib/mock-data"
import { Textarea } from "@/components/ui/textarea"

interface ProductFormProps {
  onSave: (product: Product) => void
  onCancel: () => void
  initialProduct?: Product
}

const KR_TEMPLATES = [
  { name: "Monthly Recurring Revenue", unit: "$", icon: DollarSign },
  { name: "Customer Acquisition Cost", unit: "$", icon: DollarSign },
  { name: "Active Paying Customers", unit: "", icon: Users },
  { name: "Net Revenue Retention", unit: "%", icon: TrendingUp },
  { name: "Gross Margin", unit: "%", icon: TrendingUp },
  { name: "Customer Lifetime Value", unit: "$", icon: DollarSign },
  { name: "Conversion Rate", unit: "%", icon: Target },
  { name: "Churn Rate", unit: "%", icon: Users },
]

export function ProductForm({ onSave, onCancel, initialProduct }: ProductFormProps) {
  const [step, setStep] = useState(1)
  const [aiDescription, setAiDescription] = useState("")
  const [isParsing, setIsParsing] = useState(false)

  const [name, setName] = useState(initialProduct?.name || "")
  const [client, setClient] = useState(initialProduct?.client || "")
  const [clientType, setClientType] = useState<ClientType>(initialProduct?.clientType || "SMB")
  const [description, setDescription] = useState(initialProduct?.description || "")
  const [whyItMatters, setWhyItMatters] = useState(initialProduct?.whyItMatters || "")
  const [stage, setStage] = useState<ProductStage>(initialProduct?.stage || "Proving")
  const [metrics, setMetrics] = useState<Partial<Metric>[]>(initialProduct?.metrics || [])

  const handleAIParse = async () => {
    if (!aiDescription.trim()) return

    setIsParsing(true)
    try {
      const response = await fetch("/api/parse-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription }),
      })

      if (!response.ok) throw new Error("Failed to parse")

      const parsed = await response.json()

      setName(parsed.name || "")
      setClient(parsed.client || "")
      setClientType(parsed.clientType || "SMB")
      setDescription(parsed.description || "")
      setWhyItMatters(parsed.whyItMatters || "")
      setStage(parsed.stage || "Proving")

      if (parsed.metrics && parsed.metrics.length > 0) {
        setMetrics(parsed.metrics)
      }

      setAiDescription("")
      setStep(2)
    } catch (error) {
      console.error("Parse error:", error)
    } finally {
      setIsParsing(false)
    }
  }

  const addMetricFromTemplate = (template: (typeof KR_TEMPLATES)[0]) => {
    if (metrics.length >= 3) return
    setMetrics([
      ...metrics,
      {
        name: template.name,
        current: 0,
        target: 0,
        baseline: 0,
        benchmark: 0,
        benchmarkLabel: "Industry avg",
        unit: template.unit,
        status: "COLD",
      },
    ])
  }

  const addCustomMetric = () => {
    if (metrics.length >= 3) return
    setMetrics([
      ...metrics,
      {
        name: "",
        current: 0,
        target: 0,
        baseline: 0,
        benchmark: 0,
        benchmarkLabel: "",
        unit: "",
        status: "COLD",
      },
    ])
  }

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index))
  }

  const updateMetric = (index: number, field: string, value: string | number) => {
    const updated = [...metrics]
    updated[index] = { ...updated[index], [field]: value }
    setMetrics(updated)
  }

  const calculateStatus = (current: number, baseline: number, target: number): "HOT" | "COLD" | "BLEEDING" => {
    const progress = baseline === target ? 0 : (current - baseline) / (target - baseline)
    if (progress >= 0.5) return "HOT"
    if (progress > 0) return "COLD"
    return "BLEEDING"
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (metrics.length === 0) return

    const product: Product = {
      id: initialProduct?.id || Date.now().toString(),
      name,
      client,
      clientType,
      description,
      whyItMatters,
      stage,
      healthAnalysis: {
        status: "warning",
        headline: "New client — tracking begins now",
        insight: "We'll analyze business outcomes as data comes in.",
      },
      metrics: metrics.map((m, i) => ({
        id: `m${Date.now()}_${i}`,
        name: m.name || "",
        current: m.current || 0,
        target: m.target || 0,
        baseline: m.baseline || 0,
        benchmark: m.benchmark || 0,
        benchmarkLabel: m.benchmarkLabel || "Industry avg",
        unit: m.unit || "",
        status: calculateStatus(m.current || 0, m.baseline || 0, m.target || 0),
        trend: "stagnant" as const,
        streak: 0,
        data: [
          { week: "W1", value: m.baseline || 0 },
          { week: "W2", value: m.current || 0 },
        ],
        lastUpdated: "Just now",
        aiVerdict: {
          type: "challenge",
          message: "Fresh KR. Let's see if this moves the needle.",
        },
      })),
      poActions: [],
    }

    onSave(product)
  }

  const stepTitles = ["Describe", "Details", "Key Results"]

  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <button
            onClick={step > 1 ? () => setStep(step - 1) : onCancel}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100"
          >
            {step > 1 ? <ChevronLeft className="h-6 w-6" /> : <X className="h-6 w-6" />}
          </button>
          <div className="text-center">
            <h1 className="font-semibold text-lg text-gray-900">Add Client</h1>
            <p className="text-xs text-gray-400">{stepTitles[step - 1]}</p>
          </div>
          <div className="w-10" />
        </div>
        {/* Progress dots */}
        <div className="px-5 pb-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-6 bg-[#FF4D00]" : s < step ? "w-2 bg-[#FF4D00]" : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pb-32">
        {/* Step 1: AI Quick Entry */}
        {step === 1 && (
          <div className="p-6 space-y-8">
            <div className="text-center pt-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF4D00] to-[#00D4FF] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#FF4D00]/20">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about the client</h2>
              <p className="text-gray-500 text-base max-w-xs mx-auto leading-relaxed">
                Describe the product and business outcomes. We'll extract the key details.
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="Example: Velvet Verify is a digital health wallet for millennials. We're targeting $50K MRR from current $28K, aiming for 5,000 active users from 2,000. This is a Series A startup focused on growth."
                className="min-h-36 text-base bg-gray-50 border-0 rounded-2xl resize-none focus:ring-2 focus:ring-[#FF4D00]/20 placeholder:text-gray-400"
                rows={5}
              />

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Include</p>
                <div className="flex flex-wrap gap-2">
                  {["Revenue", "Customers", "Costs", "Growth %"].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-white rounded-full text-sm text-gray-600 border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                type="button"
                onClick={handleAIParse}
                disabled={!aiDescription.trim() || isParsing}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-[#FF4D00] hover:bg-[#E64500] shadow-lg shadow-[#FF4D00]/20"
              >
                {isParsing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
              </Button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full text-center text-gray-400 font-medium py-3 text-sm"
              >
                Skip AI, enter manually
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Product Details */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Product Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Velvet Verify"
                  required
                  className="h-14 text-lg rounded-2xl border-0 bg-gray-50 focus:ring-2 focus:ring-[#FF4D00]/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Client Contact</Label>
                <Input
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g., Raymond Willey"
                  required
                  className="h-14 text-lg rounded-2xl border-0 bg-gray-50 focus:ring-2 focus:ring-[#FF4D00]/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClientType("SMB")}
                    className={`h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all ${
                      clientType === "SMB"
                        ? "bg-[#FF4D00] text-white shadow-lg shadow-[#FF4D00]/20"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                    SMB
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType("Startup")}
                    className={`h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all ${
                      clientType === "Startup"
                        ? "bg-[#00D4FF] text-white shadow-lg shadow-[#00D4FF]/20"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Rocket className="h-5 w-5" />
                    Startup
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this product do?"
                  className="min-h-24 text-base rounded-2xl border-0 bg-gray-50 resize-none focus:ring-2 focus:ring-[#FF4D00]/20"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Business Impact</Label>
                <Textarea
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  placeholder="Revenue growth, cost savings, market expansion..."
                  className="min-h-20 text-base rounded-2xl border-0 bg-gray-50 resize-none focus:ring-2 focus:ring-[#FF4D00]/20"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Stage</Label>
                <div className="flex gap-2">
                  {(["Proving", "Scaling", "Operated"] as ProductStage[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStage(s)}
                      className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all ${
                        stage === s ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setStep(3)}
              className="w-full h-14 text-base font-semibold rounded-2xl bg-gray-900 hover:bg-gray-800"
            >
              Continue
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 3: Key Results */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Key Results</h2>
              <p className="text-gray-500 text-sm">Up to 3 business outcomes. No project metrics.</p>
            </div>

            {/* KR Templates */}
            {metrics.length < 3 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quick Add</p>
                <div className="flex flex-wrap gap-2">
                  {KR_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => addMetricFromTemplate(template)}
                      className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 active:bg-gray-100 transition-all"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCustomMetric}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium flex items-center justify-center gap-2 active:border-[#FF4D00] active:text-[#FF4D00]"
                >
                  <Plus className="h-5 w-5" />
                  Custom KR
                </button>
              </div>
            )}

            {/* Added KRs */}
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <Card key={index} className="border-0 shadow-lg rounded-3xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#FF4D00] to-[#FF6B2B] px-5 py-3 flex items-center justify-between">
                    <span className="text-white font-bold">KR {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeMetric(index)}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <Input
                      value={metric.name}
                      onChange={(e) => updateMetric(index, "name", e.target.value)}
                      placeholder="Metric name"
                      className="h-12 text-base rounded-xl border-0 bg-gray-50"
                    />

                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Unit</Label>
                        <Input
                          value={metric.unit}
                          onChange={(e) => updateMetric(index, "unit", e.target.value)}
                          placeholder="$"
                          className="h-10 text-sm rounded-xl border-0 bg-gray-50 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Now</Label>
                        <Input
                          type="number"
                          value={metric.current || ""}
                          onChange={(e) => updateMetric(index, "current", Number.parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm rounded-xl border-0 bg-gray-50 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Base</Label>
                        <Input
                          type="number"
                          value={metric.baseline || ""}
                          onChange={(e) => updateMetric(index, "baseline", Number.parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm rounded-xl border-0 bg-gray-50 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Target</Label>
                        <Input
                          type="number"
                          value={metric.target || ""}
                          onChange={(e) => updateMetric(index, "target", Number.parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm rounded-xl border-0 bg-gray-50 text-center"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {metrics.length > 0 && (
              <Button
                type="submit"
                className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-[#FF4D00] to-[#00D4FF] shadow-lg"
              >
                Add Client
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
