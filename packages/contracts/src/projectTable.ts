import type { Permission } from "@role-dashboard/authz";

export type ProjectRowActionContract =
  | "view-project"
  | "open-pentest-workspace"
  | "assign-pentesters"
  | "review-security-bugs";

export type ProjectTableColumnContract = {
  columnKey: string;
  defaultLabel: string;
  faLabel: string;
  dataType: "text" | "date" | "status" | "user" | "link" | "count" | "action";
  tableContexts: string[];
  applicableViews?: string[];
  isConfigurable: boolean;
  isDefaultVisible: boolean;
  isMandatory: boolean;
  defaultOrder: number;
  sortable: boolean;
  filterable: boolean;
  minWidth?: string;
  maxWidth?: string;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  isSensitive: boolean;
};
