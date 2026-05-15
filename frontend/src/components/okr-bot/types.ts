import type { OkrBotAction } from "@/lib/okrs";

export type OkrBotActionIconName = "bars" | "chart" | "plus" | "spark" | "target" | "tool";

export type OkrBotActionItem = {
  description: string;
  icon: OkrBotActionIconName;
  label: string;
  value: OkrBotAction;
};

export type OkrBotEntityOption = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

export type OkrBotSaveState =
  | {
      message: string;
      status: "error" | "success";
    }
  | null;
