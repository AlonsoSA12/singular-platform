export type AppRoleOption = {
  color: string;
  key: string;
  label: string;
};

export const APP_ROLE_OPTIONS: AppRoleOption[] = [
  {
    key: "team_admin",
    label: "Team Admin",
    color: "#bfe0ff"
  },
  {
    key: "client",
    label: "Client",
    color: "#cfe8ff"
  },
  {
    key: "talent",
    label: "Talent",
    color: "#bfeee4"
  },
  {
    key: "ui_ux_qa",
    label: "UI-UX / QA",
    color: "#cfeebf"
  },
  {
    key: "product_owner",
    label: "Product Owner",
    color: "#bfeee4"
  }
];

const FALLBACK_ROLE_OPTION: AppRoleOption = {
  key: "sin_role",
  label: "Sin role",
  color: "#7f87aa"
};

function normalizeRoleValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getAppRoleOption(role: string | null | undefined): AppRoleOption {
  if (!role || role.trim().length === 0) {
    return FALLBACK_ROLE_OPTION;
  }

  const normalizedRole = normalizeRoleValue(role);
  const matchedRole = APP_ROLE_OPTIONS.find(
    (option) =>
      normalizeRoleValue(option.key) === normalizedRole ||
      normalizeRoleValue(option.label) === normalizedRole
  );

  if (matchedRole) {
    return matchedRole;
  }

  return {
    ...FALLBACK_ROLE_OPTION,
    key: normalizedRole || FALLBACK_ROLE_OPTION.key,
    label: role.trim()
  };
}
