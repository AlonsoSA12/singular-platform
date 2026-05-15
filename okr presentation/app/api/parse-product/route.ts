import { generateText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { description }: { description: string } = await req.json()

  const prompt = `You are a business outcome analyzer for a product ROI tracking app called Singular. 
Extract structured product information from this description, focusing ONLY on business outcomes and ROI metrics.

IMPORTANT: This app tracks BUSINESS RESULTS, not project delivery metrics. 
- NO story points, sprints, or velocity
- NO project completion percentages
- NO technical milestones
- ONLY revenue, customers, costs, margins, retention, and growth metrics

Description:
"${description}"

Return a JSON object with this exact structure:
{
  "name": "product name",
  "client": "client/stakeholder name",
  "clientType": "SMB" | "Startup",
  "description": "brief description of what the product does (1-2 sentences)",
  "whyItMatters": "the business impact this product will drive (revenue, costs, growth)",
  "stage": "Proving" | "Scaling" | "Operated",
  "metrics": [
    {
      "name": "metric name (must be business outcome like MRR, CAC, NRR, Active Customers, Margin, etc.)",
      "current": number,
      "target": number,
      "baseline": number,
      "benchmark": number,
      "benchmarkLabel": "e.g., Industry average, Top performers",
      "unit": "$ or % or customers"
    }
  ]
}

Rules:
- clientType: "Startup" if it mentions funding, Series A/B, growth-stage, or rapid scaling. Otherwise "SMB"
- stage: "Proving" if early/testing market fit, "Scaling" if growing, "Operated" if mature/stable
- metrics: Include 2-3 business outcome metrics ONLY. Examples:
  - Revenue: MRR, ARR, Revenue Growth, Average Deal Size
  - Customers: Active Users, New Customers, Churn Rate, NRR
  - Efficiency: CAC, LTV, Gross Margin, Operating Costs
  - Growth: Conversion Rate, Market Share, Expansion Revenue
- If no benchmark given, estimate industry average
- All numbers should be realistic based on context

Return ONLY the JSON, no explanation.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      maxOutputTokens: 700,
      temperature: 0.3,
    })

    const parsed = JSON.parse(text.trim())
    return Response.json(parsed)
  } catch (error) {
    console.error("[v0] Product parsing error:", error)
    return Response.json({ error: "Failed to parse product description" }, { status: 500 })
  }
}
