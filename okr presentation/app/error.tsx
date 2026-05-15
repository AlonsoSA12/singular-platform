"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[v0] App error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-5">
      <Card className="max-w-md w-full p-8 border-2 border-red-200 bg-red-50">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 border-2 border-red-300">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-700 mb-4">
              The app encountered an error. This has been logged for debugging.
            </p>
            <details className="text-left bg-white rounded-lg p-4 border border-red-200 mb-4">
              <summary className="cursor-pointer font-semibold text-sm text-red-600">Error details</summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">{error.message}</pre>
            </details>
          </div>
          <Button onClick={reset} size="lg" className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            Go to home
          </Button>
        </div>
      </Card>
    </div>
  )
}
