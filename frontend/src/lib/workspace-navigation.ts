export const WORKSPACE_LAST_VIEW_COOKIE = "singular-workspace-last-view";

export type WorkspaceModuleId = "trustworthiness" | "okrs" | "okr-bot" | "portfolio-analysis";

export const DEFAULT_WORKSPACE_MODULE: WorkspaceModuleId = "trustworthiness";

export const WORKSPACE_MODULES: ReadonlyArray<{
  href: string;
  icon: string;
  id: WorkspaceModuleId;
  label: string;
  title: string;
}> = [
  {
    id: "trustworthiness",
    href: "/workspace/trustworthiness",
    icon: "TW",
    label: "TW Monthly",
    title: "Monthly Trustworthiness"
  },
  {
    id: "okrs",
    href: "/workspace/okrs",
    icon: "OKR",
    label: "OKRs",
    title: "OKRs"
  },
  {
    id: "okr-bot",
    href: "/workspace/okr-bot",
    icon: "BOT",
    label: "OKR Bot",
    title: "OKR Bot"
  },
  {
    id: "portfolio-analysis",
    href: "/workspace/portfolio-analysis",
    icon: "PA",
    label: "Portfolio",
    title: "Portfolio Analysis"
  }
];

export function getWorkspaceModuleFromPathname(pathname: string): WorkspaceModuleId | null {
  if (pathname.startsWith("/workspace/portfolio-analysis")) {
    return "portfolio-analysis";
  }

  if (pathname.startsWith("/workspace/okr-bot")) {
    return "okr-bot";
  }

  if (pathname.startsWith("/workspace/okrs")) {
    return "okrs";
  }

  if (pathname.startsWith("/workspace/trustworthiness")) {
    return "trustworthiness";
  }

  return null;
}

export function getWorkspaceModuleHref(moduleId: WorkspaceModuleId) {
  if (moduleId === "okrs") return "/workspace/okrs";
  if (moduleId === "okr-bot") return "/workspace/okr-bot";
  if (moduleId === "portfolio-analysis") return "/workspace/portfolio-analysis";
  return "/workspace/trustworthiness";
}

export function readWorkspaceModuleCookie(
  value: string | null | undefined
): WorkspaceModuleId {
  return value === "okrs" || value === "okr-bot" || value === "trustworthiness" || value === "portfolio-analysis"
    ? value
    : DEFAULT_WORKSPACE_MODULE;
}
