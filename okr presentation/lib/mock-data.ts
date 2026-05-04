export type ProductStage = "Initiating" | "Proving" | "Scaling" | "Operated" | "Sunset"
export type MetricStatus = "HOT" | "COLD" | "BLEEDING"
export type ClientType = "SMB" | "Startup"

export interface ProductOwner {
  name: string
  avatar?: string
}

export const productOwner: ProductOwner = {
  name: "Claudia Galdamez",
}

export interface DataPoint {
  sprint: string
  date: string
  value: number
}

export interface KeyResult {
  id: string
  name: string
  current: number
  target: number
  baseline: number
  benchmark: number
  benchmarkLabel: string
  unit: string
  status: MetricStatus
  streak: number
  data: DataPoint[]
  lastUpdated: string
  lastUpdatedDate?: Date // Added actual date for stale calculation
  aiVerdict: {
    type: "praise" | "challenge"
    message: string
  }
}

export function isMetricStale(lastUpdated: string, lastUpdatedDate?: Date): boolean {
  if (lastUpdatedDate) {
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceUpdate >= 7
  }

  // Parse lastUpdated string for fallback
  if (lastUpdated.includes("week") || lastUpdated.includes("month")) {
    return true
  }
  if (lastUpdated.includes("day")) {
    const days = Number.parseInt(lastUpdated.match(/\d+/)?.[0] || "0")
    return days >= 7
  }
  return false
}

export function getDaysSinceUpdate(lastUpdated: string, lastUpdatedDate?: Date): number {
  if (lastUpdatedDate) {
    return Math.floor((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (lastUpdated.includes("week")) {
    const weeks = Number.parseInt(lastUpdated.match(/\d+/)?.[0] || "1")
    return weeks * 7
  }
  if (lastUpdated.includes("month")) {
    const months = Number.parseInt(lastUpdated.match(/\d+/)?.[0] || "1")
    return months * 30
  }
  if (lastUpdated.includes("day")) {
    return Number.parseInt(lastUpdated.match(/\d+/)?.[0] || "0")
  }
  return 0
}

export function getStaleMetricsCount(product: Product): number {
  return product.metrics.filter((metric) => isMetricStale(metric.lastUpdated, metric.lastUpdatedDate)).length
}

export interface Product {
  id: string
  name: string
  client: string
  clientType: ClientType
  stage: ProductStage
  description: string
  objective: string
  businessContext: string
  metrics: KeyResult[]
  poActions: string[]
  healthAnalysis: {
    status: "thriving" | "warning" | "critical"
    headline: string
    insight: string
  }
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Perry Construction",
    client: "Ed Wilkinson",
    clientType: "SMB",
    stage: "Proving",
    description:
      "A construction management platform that helps Construction Managers (CMs) log timesheets, daily reports, and track project budgets.",
    objective:
      "Optimize operations for construction managers—reduce admin time, increase tool adoption, and cut budget overruns.",
    businessContext:
      "If Perry CMs fully adopt this platform, they could save $250K+ annually in labor costs while catching budget overruns before they become crises.",
    healthAnalysis: {
      status: "warning",
      headline: "Adoption plateau limiting ROI potential",
      insight:
        "Time savings are strong but stalled adoption at 60% means 40% of CMs aren't contributing to budget tracking accuracy. The declining budget overrun metric suggests the CMs not using the system are the ones managing the most problematic projects. Focus on getting the remaining 12 CMs onboarded—that's where your ROI unlock is hiding.",
    },
    metrics: [
      {
        id: "m1",
        name: "Weekly Time Saved per CM",
        current: 4.2,
        target: 6,
        baseline: 1.5,
        benchmark: 5,
        benchmarkLabel: "Industry best practice",
        unit: "hrs",
        status: "HOT",
        streak: 5,
        data: [
          { sprint: "S1", date: "Sep 16", value: 1.5 },
          { sprint: "S2", date: "Sep 30", value: 2.1 },
          { sprint: "S3", date: "Oct 14", value: 2.8 },
          { sprint: "S4", date: "Oct 28", value: 3.4 },
          { sprint: "S5", date: "Nov 11", value: 3.9 },
          { sprint: "S6", date: "Nov 25", value: 4.2 },
        ],
        lastUpdated: "2 days ago",
        lastUpdatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "Time savings up 180% from baseline. Each CM saves 4.2 hours/week on timesheets and daily reports vs the old method. That's 4+ hours back on actual construction work. At 18 active CMs, you're saving 75+ hours weekly across the team.",
        },
      },
      {
        id: "m2",
        name: "Monthly Active CM Adoption",
        current: 18,
        target: 30,
        baseline: 8,
        benchmark: 24,
        benchmarkLabel: "80% adoption",
        unit: "/30",
        status: "COLD",
        streak: 3,
        data: [
          { sprint: "S1", date: "Sep 16", value: 8 },
          { sprint: "S2", date: "Sep 30", value: 11 },
          { sprint: "S3", date: "Oct 14", value: 14 },
          { sprint: "S4", date: "Oct 28", value: 16 },
          { sprint: "S5", date: "Nov 11", value: 18 },
          { sprint: "S6", date: "Nov 25", value: 18 },
        ],
        lastUpdated: "12 days ago",
        lastUpdatedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Adoption stalled at 18 out of 30 CMs for 2 weeks. 12 managers still aren't using the CMS. That's 40% of your workforce logging the old way—wasting time and creating data gaps. What's blocking them? Training? Habit? Resistance? Find out and fix it.",
        },
      },
      {
        id: "m3",
        name: "Budget Overrun Reduction",
        current: 8,
        target: 20,
        baseline: 0,
        benchmark: 15,
        benchmarkLabel: "Meaningful impact",
        unit: "%",
        status: "BLEEDING",
        streak: 2,
        data: [
          { sprint: "S1", date: "Sep 16", value: 0 },
          { sprint: "S2", date: "Sep 30", value: 5 },
          { sprint: "S3", date: "Oct 14", value: 9 },
          { sprint: "S4", date: "Oct 28", value: 11 },
          { sprint: "S5", date: "Nov 11", value: 9 },
          { sprint: "S6", date: "Nov 25", value: 8 },
        ],
        lastUpdated: "3 weeks ago",
        lastUpdatedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Budget overrun reduction slipped from 11% to 8%—going backwards. You need 20% reduction per trimester and you're at 8%. That's real money bleeding out. The CMS should catch overruns early—are CMs actually logging expenses in real-time? If half aren't using it, there's your answer.",
        },
      },
    ],
    poActions: [
      "Run adoption workshop for 12 non-active CMs",
      "Investigate budget tracking workflow gaps",
      "Set up weekly check-ins with Ed Wilkinson",
    ],
  },
  {
    id: "2",
    name: "Housing Research",
    client: "Raymond Willey",
    clientType: "Startup",
    stage: "Scaling",
    description:
      "A powerful analytics platform that tracks and predicts real estate sales trends across the biggest developers in the U.S. Using an automated data-scraping engine, it delivers weekly insights and competitive comparisons that teams can't find anywhere else.",
    objective:
      "Become the go-to analytics platform for real estate market intelligence with industry-leading prediction accuracy.",
    businessContext:
      "Housing Research is positioned to capture a $2B market intelligence gap. Each enterprise client represents $50K+ ARR potential.",
    healthAnalysis: {
      status: "thriving",
      headline: "All systems go—scaling mode activated",
      insight:
        "Housing Research is firing on all cylinders. ARR growth is accelerating, prediction accuracy exceeds analyst benchmarks, and retention is near-perfect. The question isn't whether you'll hit targets—it's how fast you can scale sales to capture this market before competitors catch up.",
    },
    metrics: [
      {
        id: "m4",
        name: "Annual Recurring Revenue",
        current: 156000,
        target: 250000,
        baseline: 95000,
        benchmark: 180000,
        benchmarkLabel: "Series A benchmark",
        unit: "$",
        status: "HOT",
        streak: 8,
        data: [
          { sprint: "S1", date: "Sep 16", value: 95000 },
          { sprint: "S2", date: "Sep 30", value: 112000 },
          { sprint: "S3", date: "Oct 14", value: 128000 },
          { sprint: "S4", date: "Oct 28", value: 140000 },
          { sprint: "S5", date: "Nov 11", value: 150000 },
          { sprint: "S6", date: "Nov 25", value: 156000 },
        ],
        lastUpdated: "1 day ago",
        lastUpdatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "ARR up 64% from baseline. You've blown past benchmark and you're 8 weeks from target. This is what product-market fit looks like.",
        },
      },
      {
        id: "m5",
        name: "Prediction Accuracy",
        current: 89,
        target: 95,
        baseline: 72,
        benchmark: 85,
        benchmarkLabel: "Analyst-grade accuracy",
        unit: "%",
        status: "HOT",
        streak: 6,
        data: [
          { sprint: "S1", date: "Sep 16", value: 72 },
          { sprint: "S2", date: "Sep 30", value: 78 },
          { sprint: "S3", date: "Oct 14", value: 82 },
          { sprint: "S4", date: "Oct 28", value: 85 },
          { sprint: "S5", date: "Nov 11", value: 88 },
          { sprint: "S6", date: "Nov 25", value: 89 },
        ],
        lastUpdated: "3 days ago",
        lastUpdatedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "89% accuracy beats most human analysts. Your data engine is working. Keep pushing toward 95% and you own this market.",
        },
      },
      {
        id: "m6",
        name: "Enterprise Client Retention",
        current: 94,
        target: 95,
        baseline: 85,
        benchmark: 90,
        benchmarkLabel: "SaaS average",
        unit: "%",
        status: "HOT",
        streak: 4,
        data: [
          { sprint: "S1", date: "Sep 16", value: 85 },
          { sprint: "S2", date: "Sep 30", value: 88 },
          { sprint: "S3", date: "Oct 14", value: 90 },
          { sprint: "S4", date: "Oct 28", value: 92 },
          { sprint: "S5", date: "Nov 11", value: 93 },
          { sprint: "S6", date: "Nov 25", value: 94 },
        ],
        lastUpdated: "5 days ago",
        lastUpdatedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "94% retention is exceptional for enterprise SaaS. You're 1 point from target. These clients are sticky—now focus on expansion revenue.",
        },
      },
    ],
    poActions: [
      "Launch enterprise expansion campaign",
      "Document prediction methodology for sales team",
      "Schedule quarterly business reviews with top 5 accounts",
    ],
  },
  {
    id: "3",
    name: "Velvet Verify",
    client: "Gil Cope",
    clientType: "Startup",
    stage: "Proving",
    description:
      "A next-generation digital sexual-health wallet. Users securely store and share verified STI results, while AI checks authenticity and alerts them to potential risks based on recent connections. It's smart, safe, and redefining modern sexual wellness.",
    objective: "Build trust in digital health verification with best-in-class security and user adoption.",
    businessContext:
      "Sexual health verification is a $500M untapped market. Each verified user represents potential lifetime value of $200+ through premium features.",
    healthAnalysis: {
      status: "thriving",
      headline: "Viral growth with monetization opportunity",
      insight:
        "User growth is exceptional and verification accuracy builds trust. The conversion plateau is your biggest opportunity—12,400 users at 8.5% conversion vs 15% is leaving $50K+ ARR on the table. Focus on premium value proposition.",
    },
    metrics: [
      {
        id: "m7",
        name: "Monthly Active Users",
        current: 12400,
        target: 25000,
        baseline: 3200,
        benchmark: 15000,
        benchmarkLabel: "Market traction threshold",
        unit: "",
        status: "HOT",
        streak: 7,
        data: [
          { sprint: "S1", date: "Sep 16", value: 3200 },
          { sprint: "S2", date: "Sep 30", value: 5100 },
          { sprint: "S3", date: "Oct 14", value: 7200 },
          { sprint: "S4", date: "Oct 28", value: 9100 },
          { sprint: "S5", date: "Nov 11", value: 11000 },
          { sprint: "S6", date: "Nov 25", value: 12400 },
        ],
        lastUpdated: "1 day ago",
        lastUpdatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "287% user growth from baseline. You're approaching the 15K traction threshold fast. Word-of-mouth is clearly working—users trust this product enough to recommend it for something deeply personal.",
        },
      },
      {
        id: "m8",
        name: "Verification Success Rate",
        current: 97.2,
        target: 99,
        baseline: 89,
        benchmark: 95,
        benchmarkLabel: "Healthcare standard",
        unit: "%",
        status: "HOT",
        streak: 5,
        data: [
          { sprint: "S1", date: "Sep 16", value: 89 },
          { sprint: "S2", date: "Sep 30", value: 92 },
          { sprint: "S3", date: "Oct 14", value: 94 },
          { sprint: "S4", date: "Oct 28", value: 95.5 },
          { sprint: "S5", date: "Nov 11", value: 96.5 },
          { sprint: "S6", date: "Nov 25", value: 97.2 },
        ],
        lastUpdated: "2 days ago",
        lastUpdatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "97.2% verification success exceeds healthcare standards. Your AI authentication is working. The 2.8% failure rate is worth investigating—are they fraudulent attempts or UX friction?",
        },
      },
      {
        id: "m9",
        name: "Premium Conversion Rate",
        current: 8.5,
        target: 15,
        baseline: 3,
        benchmark: 10,
        benchmarkLabel: "Freemium SaaS average",
        unit: "%",
        status: "COLD",
        streak: 2,
        data: [
          { sprint: "S1", date: "Sep 16", value: 3 },
          { sprint: "S2", date: "Sep 30", value: 5 },
          { sprint: "S3", date: "Oct 14", value: 6.5 },
          { sprint: "S4", date: "Oct 28", value: 7.5 },
          { sprint: "S5", date: "Nov 11", value: 8.2 },
          { sprint: "S6", date: "Nov 25", value: 8.5 },
        ],
        lastUpdated: "4 days ago",
        lastUpdatedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Conversion slowing at 8.5%—you need 15%. Users love the free product but aren't seeing enough value in premium. What's in premium? Is it compelling? Time to A/B test pricing and feature gates.",
        },
      },
    ],
    poActions: [
      "Run premium feature value proposition tests",
      "Analyze 2.8% verification failure cases",
      "Launch referral program to accelerate growth",
    ],
  },
  {
    id: "4",
    name: "ProDriven Global Brands",
    client: "Farewell, Inc.",
    clientType: "SMB",
    stage: "Scaling",
    description:
      "A centralized command center for creative teams managing multiple global brands at once. It streamlines requests, assignments, and deliverables—keeping everyone aligned, organized, and moving fast.",
    objective: "Reduce creative ops overhead and accelerate campaign delivery across all brand portfolios.",
    businessContext:
      "ProDriven serves mid-market agencies managing 5-20 brands. Each hour saved in creative ops = $150 in recovered billable time.",
    healthAnalysis: {
      status: "thriving",
      headline: "Operational excellence driving results",
      insight:
        "ProDriven is delivering real efficiency gains. Delivery time is down 40%, utilization is optimal. The satisfaction plateau suggests speed alone isn't enough—clients want something more. Could be communication, could be creative quality. Worth investigating.",
    },
    metrics: [
      {
        id: "m10",
        name: "Campaign Delivery Time",
        current: 4.2,
        target: 3,
        baseline: 7,
        benchmark: 5,
        benchmarkLabel: "Agency average",
        unit: " days",
        status: "HOT",
        streak: 6,
        data: [
          { sprint: "S1", date: "Sep 16", value: 7 },
          { sprint: "S2", date: "Sep 30", value: 6.2 },
          { sprint: "S3", date: "Oct 14", value: 5.5 },
          { sprint: "S4", date: "Oct 28", value: 5 },
          { sprint: "S5", date: "Nov 11", value: 4.5 },
          { sprint: "S6", date: "Nov 25", value: 4.2 },
        ],
        lastUpdated: "3 days ago",
        lastUpdatedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "Delivery time down 40% from baseline. You've beaten the agency benchmark. At 4.2 days, you're 1.2 days from target—that's within reach this quarter.",
        },
      },
      {
        id: "m11",
        name: "Creative Team Utilization",
        current: 78,
        target: 85,
        baseline: 62,
        benchmark: 75,
        benchmarkLabel: "Healthy utilization",
        unit: "%",
        status: "HOT",
        streak: 4,
        data: [
          { sprint: "S1", date: "Sep 16", value: 62 },
          { sprint: "S2", date: "Sep 30", value: 66 },
          { sprint: "S3", date: "Oct 14", value: 70 },
          { sprint: "S4", date: "Oct 28", value: 73 },
          { sprint: "S5", date: "Nov 11", value: 76 },
          { sprint: "S6", date: "Nov 25", value: 78 },
        ],
        lastUpdated: "2 days ago",
        lastUpdatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "78% utilization is 3 points above healthy benchmark. You're not overworking teams but you're not leaving money on the table either. Sweet spot.",
        },
      },
      {
        id: "m12",
        name: "Client Satisfaction Score",
        current: 4.3,
        target: 4.7,
        baseline: 3.8,
        benchmark: 4.2,
        benchmarkLabel: "Industry NPS equivalent",
        unit: "/5",
        status: "COLD",
        streak: 3,
        data: [
          { sprint: "S1", date: "Sep 16", value: 3.8 },
          { sprint: "S2", date: "Sep 30", value: 4 },
          { sprint: "S3", date: "Oct 14", value: 4.1 },
          { sprint: "S4", date: "Oct 28", value: 4.2 },
          { sprint: "S5", date: "Nov 11", value: 4.3 },
          { sprint: "S6", date: "Nov 25", value: 4.3 },
        ],
        lastUpdated: "1 week ago",
        lastUpdatedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Satisfaction stalled at 4.3 for two sprints. You're above benchmark but not wowing clients. Faster delivery should mean happier clients—why isn't it translating? Survey them.",
        },
      },
    ],
    poActions: [
      "Deploy client satisfaction survey",
      "Analyze correlation between delivery speed and satisfaction",
      "Identify top 3 friction points in client communication",
    ],
  },
  {
    id: "5",
    name: "Lunch Bunch",
    client: "Bianca Castagno",
    clientType: "Startup",
    stage: "Proving",
    description:
      "A dynamic scheduling and class-management platform for a Bay Area company delivering cooking classes in schools. It matches freelance teachers to classes based on availability and location, making operations smoother and more scalable every semester.",
    objective: "Achieve operational efficiency that enables profitable scaling to new school districts.",
    businessContext:
      "Each new school district represents $40K annual revenue. Operational efficiency is the gate to geographic expansion.",
    healthAnalysis: {
      status: "thriving",
      headline: "Ready for controlled expansion",
      insight:
        "Lunch Bunch has cracked the ops efficiency puzzle. Fill rates are excellent, automation is strong, and unit economics are approaching target. The slowing cost improvement suggests you're hitting diminishing returns on current optimizations—time to test geographic expansion where volume can drive further efficiencies.",
    },
    metrics: [
      {
        id: "m13",
        name: "Teacher Fill Rate",
        current: 92,
        target: 98,
        baseline: 74,
        benchmark: 90,
        benchmarkLabel: "Sustainable operations",
        unit: "%",
        status: "HOT",
        streak: 5,
        data: [
          { sprint: "S1", date: "Sep 16", value: 74 },
          { sprint: "S2", date: "Sep 30", value: 79 },
          { sprint: "S3", date: "Oct 14", value: 84 },
          { sprint: "S4", date: "Oct 28", value: 88 },
          { sprint: "S5", date: "Nov 11", value: 91 },
          { sprint: "S6", date: "Nov 25", value: 92 },
        ],
        lastUpdated: "1 day ago",
        lastUpdatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "92% fill rate is 2 points above sustainable ops threshold. You've nearly eliminated class cancellations. That's reliability schools pay for.",
        },
      },
      {
        id: "m14",
        name: "Scheduling Automation Rate",
        current: 67,
        target: 85,
        baseline: 25,
        benchmark: 60,
        benchmarkLabel: "Meaningful automation",
        unit: "%",
        status: "HOT",
        streak: 4,
        data: [
          { sprint: "S1", date: "Sep 16", value: 25 },
          { sprint: "S2", date: "Sep 30", value: 38 },
          { sprint: "S3", date: "Oct 14", value: 48 },
          { sprint: "S4", date: "Oct 28", value: 56 },
          { sprint: "S5", date: "Nov 11", value: 63 },
          { sprint: "S6", date: "Nov 25", value: 67 },
        ],
        lastUpdated: "3 days ago",
        lastUpdatedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "Automation up 168% from baseline. 67% of schedules now need zero manual intervention. That's ops time back for growth work.",
        },
      },
      {
        id: "m15",
        name: "Cost per Class",
        current: 42,
        target: 35,
        baseline: 58,
        benchmark: 45,
        benchmarkLabel: "Profitable unit economics",
        unit: "$",
        status: "COLD",
        streak: 2,
        data: [
          { sprint: "S1", date: "Sep 16", value: 58 },
          { sprint: "S2", date: "Sep 30", value: 52 },
          { sprint: "S3", date: "Oct 14", value: 48 },
          { sprint: "S4", date: "Oct 28", value: 45 },
          { sprint: "S5", date: "Nov 11", value: 43 },
          { sprint: "S6", date: "Nov 25", value: 42 },
        ],
        lastUpdated: "5 days ago",
        lastUpdatedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Cost per class improvement is slowing—$42 vs $35 target. You're below benchmark but the gains are getting harder. Where's the remaining $7 hiding? Teacher rates? Travel? Admin overhead?",
        },
      },
    ],
    poActions: [
      "Analyze cost breakdown for remaining $7 gap",
      "Pilot expansion to one new school district",
      "Optimize teacher-to-location matching algorithm",
    ],
  },
  {
    id: "6",
    name: "SearchMe",
    client: "GitLab Foundation",
    clientType: "SMB",
    stage: "Scaling",
    description:
      "An enterprise search API that helps organizations surface knowledge buried in their documentation, code repositories, and internal wikis.",
    objective: "Deliver measurable productivity gains through faster information retrieval across enterprise clients.",
    businessContext:
      "Every minute saved in search = $2.50 in enterprise productivity. SearchMe targets companies with 500+ employees where search friction costs $500K+ annually.",
    healthAnalysis: {
      status: "warning",
      headline: "Product excellence, pipeline stagnation",
      insight:
        "SearchMe has exceptional product metrics—fast, relevant, and exceeding benchmarks. But the stalled pipeline at 12 deals is a warning sign. This isn't a product problem, it's a go-to-market problem. The PO needs to connect with sales leadership ASAP.",
    },
    metrics: [
      {
        id: "m16",
        name: "Average Query Response Time",
        current: 180,
        target: 100,
        baseline: 450,
        benchmark: 250,
        benchmarkLabel: "Acceptable UX threshold",
        unit: "ms",
        status: "HOT",
        streak: 6,
        data: [
          { sprint: "S1", date: "Sep 16", value: 450 },
          { sprint: "S2", date: "Sep 30", value: 380 },
          { sprint: "S3", date: "Oct 14", value: 310 },
          { sprint: "S4", date: "Oct 28", value: 260 },
          { sprint: "S5", date: "Nov 11", value: 210 },
          { sprint: "S6", date: "Nov 25", value: 180 },
        ],
        lastUpdated: "1 day ago",
        lastUpdatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "Response time down 60% from baseline. At 180ms you're already delivering premium UX. The 100ms target is ambitious but achievable with caching optimizations.",
        },
      },
      {
        id: "m17",
        name: "Search Relevance Score",
        current: 8.2,
        target: 9.0,
        baseline: 6.5,
        benchmark: 7.5,
        benchmarkLabel: "User satisfaction threshold",
        unit: "/10",
        status: "HOT",
        streak: 5,
        data: [
          { sprint: "S1", date: "Sep 16", value: 6.5 },
          { sprint: "S2", date: "Sep 30", value: 7 },
          { sprint: "S3", date: "Oct 14", value: 7.4 },
          { sprint: "S4", date: "Oct 28", value: 7.8 },
          { sprint: "S5", date: "Nov 11", value: 8 },
          { sprint: "S6", date: "Nov 25", value: 8.2 },
        ],
        lastUpdated: "2 days ago",
        lastUpdatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "praise",
          message:
            "8.2 relevance score is 0.7 points above the satisfaction threshold. Users are finding what they need. The jump from 8 to 9 will require AI-powered semantic understanding—worth the investment.",
        },
      },
      {
        id: "m18",
        name: "Enterprise Client Pipeline",
        current: 12,
        target: 20,
        baseline: 5,
        benchmark: 10,
        benchmarkLabel: "Healthy pipeline",
        unit: "",
        status: "COLD",
        streak: 3,
        data: [
          { sprint: "S1", date: "Sep 16", value: 5 },
          { sprint: "S2", date: "Sep 30", value: 7 },
          { sprint: "S3", date: "Oct 14", value: 9 },
          { sprint: "S4", date: "Oct 28", value: 11 },
          { sprint: "S5", date: "Nov 11", value: 12 },
          { sprint: "S6", date: "Nov 25", value: 12 },
        ],
        lastUpdated: "10 days ago",
        lastUpdatedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Added actual date for stale calculation
        aiVerdict: {
          type: "challenge",
          message:
            "Pipeline stalled at 12 for 3 weeks. Product is performing—why isn't the pipeline growing? Is this a sales capacity issue or market awareness? Your product metrics are strong enough to close deals. Feed the funnel.",
        },
      },
    ],
    poActions: [
      "Coordinate with sales on pipeline acceleration",
      "Create case study from top-performing enterprise client",
      "Evaluate semantic search upgrade ROI",
    ],
  },
]

// Alias for backwards compatibility
export type Metric = KeyResult
