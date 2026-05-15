import { generateText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { description, productName, currentMetrics } = await req.json()

  const metricsContext = currentMetrics
    .map(
      (m: { name: string; current: number; target: number; unit: string }) =>
        `- ${m.name}: currently ${m.unit}${m.current.toLocaleString()}, target ${m.unit}${m.target.toLocaleString()}`,
    )
    .join("\n")

  const prompt = `You are Singular's AI assistant helping a Product Owner log progress updates for "${productName}".

Current KRs:
${metricsContext}

The PO said:
"${description}"

Extract the new metric values from their update. Return a JSON object:
{
  "updates": [
    {
      "metricId": "exact metric id from the list",
      "newValue": number (the new value they mentioned),
      "note": "brief note about what drove this change"
    }
  ],
  "insight": "One sharp sentence about this update - be direct. If numbers are up, acknowledge it briefly. If flat or down, challenge them. No fluff. Examples: 'Revenue up 12% - the new pricing is working.' or 'Churn barely moved. What's blocking the fix?'"
}

Rules:
- Only include metrics that were mentioned in the update
- Parse numbers carefully: "$48K" = 48000, "2.1%" = 2.1, "150 customers" = 150
- The insight should be punchy and direct (Singular's personality is challenger, no corporate speak)
- Match metric names loosely (e.g., "MRR" matches "Monthly Revenue", "churn" matches "Churn Rate")

Metric IDs to use:
${currentMetrics.map((m: { id: string; name: string }) => `- "${m.id}" for "${m.name}"`).join("\n")}

Return ONLY valid JSON.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      maxOutputTokens: 400,
      temperature: 0.3,
    })

    const parsed = JSON.parse(text.trim())
    return Response.json(parsed)
  } catch (error) {
    console.error("[v0] KR update parse error:", error)
    return Response.json(
      {
        updates: [],
        insight: "Couldn't parse that. Try being more specific with the numbers.",
      },
      { status: 200 },
    )
  }
}
