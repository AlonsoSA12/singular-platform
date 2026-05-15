"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { mockProducts } from "@/lib/mock-data"
import { ClientCard } from "@/components/client-card"
import { ProductForm } from "@/components/product-form"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/mock-data"
import { BottomNav } from "@/components/bottom-nav"

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

export default function AccountsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

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

          <h1 className="font-display text-xl font-semibold text-[#171717] mb-0.5">Accounts</h1>
          <p className="text-sm text-[#9CA3AF]">Rose, Bud & Thorn Classification</p>
        </div>

        <div className="px-5 pt-5">
          {/* Rose Category */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌹</span>
              <h2 className="font-display text-lg font-semibold text-[#171717]">
                Rose · {categorizedProducts.rose.length}
              </h2>
            </div>
            <div className="space-y-3">
              {categorizedProducts.rose.map((product) => (
                <ClientCard
                  key={product.id}
                  product={product}
                  onClick={() => router.push(`/product/${product.id}`)}
                  isHovered={hoveredCard === product.id}
                  onHoverStart={() => setHoveredCard(product.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  category="rose"
                  categoryReason={getCategoryReason(product, "rose")}
                />
              ))}
            </div>
          </div>

          {/* Bud Category */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌱</span>
              <h2 className="font-display text-lg font-semibold text-[#171717]">
                Bud · {categorizedProducts.bud.length}
              </h2>
            </div>
            <div className="space-y-3">
              {categorizedProducts.bud.map((product) => (
                <ClientCard
                  key={product.id}
                  product={product}
                  onClick={() => router.push(`/product/${product.id}`)}
                  isHovered={hoveredCard === product.id}
                  onHoverStart={() => setHoveredCard(product.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  category="bud"
                  categoryReason={getCategoryReason(product, "bud")}
                />
              ))}
            </div>
          </div>

          {/* Thorn Category */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🥀</span>
              <h2 className="font-display text-lg font-semibold text-[#171717]">
                Thorn · {categorizedProducts.thorn.length}
              </h2>
            </div>
            <div className="space-y-3">
              {categorizedProducts.thorn.map((product) => (
                <ClientCard
                  key={product.id}
                  product={product}
                  onClick={() => router.push(`/product/${product.id}`)}
                  isHovered={hoveredCard === product.id}
                  onHoverStart={() => setHoveredCard(product.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  category="thorn"
                  categoryReason={getCategoryReason(product, "thorn")}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav onAddClient={() => setShowForm(true)} />
    </>
  )
}
