"use client"

import { useState, useEffect } from "react"
import { Presentation, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PresentationModeButton() {
  const [isPresentationMode, setIsPresentationMode] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPresentationMode(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const togglePresentationMode = async () => {
    try {
      if (!isPresentationMode) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch (error) {
      console.log("[v0] Fullscreen not supported or denied")
    }
  }

  return (
    <Button
      variant={isPresentationMode ? "secondary" : "default"}
      size="sm"
      onClick={togglePresentationMode}
      className="h-10 px-4 font-semibold touch-manipulation shadow-lg"
    >
      {isPresentationMode ? (
        <>
          <Minimize2 className="h-4 w-4 mr-2" />
          Exit
        </>
      ) : (
        <>
          <Presentation className="h-4 w-4 mr-2" />
          Present
        </>
      )}
    </Button>
  )
}
