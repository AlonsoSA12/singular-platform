import { generateText } from "ai"
import type { Metric } from "@/lib/mock-data"

export const maxDuration = 30

export async function POST(req: Request) {
  const { metric }: { metric: Metric } = await req.json()

  const statusContext = {
    HOT: "consistently growing for multiple weeks",
    COLD: "stagnant with no movement for 3+ weeks",
    BLEEDING: "declining over recent weeks",
  }

  const prompt = `You are a brutally honest product advisor with zero tolerance for mediocrity. Analyze this metric:

Metric: ${metric.name}
Current: ${metric.current} ${metric.unit}
Target: ${metric.target} ${metric.unit}
Baseline: ${metric.baseline} ${metric.unit}
Status: ${metric.status} (${statusContext[metric.status]})
Streak: ${metric.streak} weeks
Progress: ${Math.round(((metric.current - metric.baseline) / (metric.target - metric.baseline)) * 100)}%

Data trend: ${metric.data.map((d) => `${d.week}: ${d.value}`).join(", ")}

${metric.status === "HOT" ? "Generate a PRAISE verdict" : "Generate a CHALLENGE verdict"}

Rules:
- If HOT/growing: Acknowledge real progress but keep them hungry. Be direct and outcome-focused.
- If COLD/stagnant: Challenge them sharply. Point out the flat line. Ask tough questions.
- If BLEEDING/declining: Call out the trend urgently. Demand immediate action and accountability.
- 2-3 sentences max
- No fluff, no corporate speak
- Be snarky but professional
- Focus on outcomes and what it means for leadership

Generate only the verdict message, no extra formatting:`

  try {
    const { text } = await generateText({
      model: "openai/gpt-5-mini",
      prompt,
      maxOutputTokens: 150,
      temperature: 0.8,
    })

    return Response.json({
      type: metric.status === "HOT" ? "praise" : "challenge",
      message: text.trim(),
    })
  } catch (error) {
    console.error("[v0] AI verdict generation error:", error)
    return Response.json({ error: "Failed to generate verdict" }, { status: 500 })
  }
}
