import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { stats, portfolioGrade, products } = await request.json()

    if (!stats || !portfolioGrade || !products) {
      return Response.json({
        analysis: `Claudia's portfolio sits at a ${portfolioGrade || 0}% grade. Unable to generate detailed analysis - missing data.`,
      })
    }

    const prompt = `You are a direct, no-BS business analyst for Product Owner Claudia Galdamez managing ${stats.totalClients} clients. The portfolio currently sits at a ${portfolioGrade}% grade. Write ONE compelling paragraph analyzing the portfolio with focus on winners and losers.

Portfolio Stats:
- Grade: ${portfolioGrade}%
- ${stats.totalKRs} total Key Results tracking business ROI
- ${stats.growing} KRs growing, ${stats.stalled} stalled, ${stats.declining} declining  
- ${stats.thriving} clients thriving, ${stats.warning} warning, ${stats.critical} critical

Client Details:
${products.map((p: { name: string; clientType: string; metrics: Array<{ name: string; status: string }> }) => `- ${p.name} (${p.clientType}): ${p.metrics.map((m) => `${m.name} is ${m.status}`).join(", ")}`).join("\n")}

Rules:
- Start with "Claudia's portfolio sits at a {grade}% grade..."
- Name the top 1-2 performing clients (Rose category) and what KRs are driving their success
- Name the 1-2 problem clients (Thorn category) and which specific KRs are failing
- State how many accounts are in danger
- Keep it ONE direct paragraph, Gordon Gekko style - money talk only
- Focus on winners (what's working) and losers (what's bleeding money)
- No corporate speak, no fluff, no metaphors`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 300,
    })

    return Response.json({ analysis: text })
  } catch (error) {
    console.error("Portfolio analysis error:", error)
    const { stats, portfolioGrade } = await request.json().catch(() => ({ stats: null, portfolioGrade: 0 }))
    return Response.json({
      analysis: `Claudia's portfolio sits at a ${portfolioGrade || 0}% grade with ${stats?.growing || 0} KRs growing and ${stats?.declining || 0} declining. AI analysis temporarily unavailable.`,
    })
  }
}
